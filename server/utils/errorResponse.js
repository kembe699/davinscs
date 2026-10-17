// Turns a caught error into a clear, safe message for the client instead
// of a bare "Server error" that leaves the user no idea what to change.
//
// Two kinds of errors reach here:
//   1. A plain Error our own route code threw on purpose (e.g.
//      `throw new Error("Insufficient stock for X")`) — that message was
//      already written to be shown to the user, so pass it through as-is.
//   2. A raw Postgres driver error (has `.code`) — translate the common,
//      user-actionable codes (duplicate value, required field, bad
//      reference, etc.) into a plain-language message instead of leaking
//      raw SQL/constraint text. Anything we don't recognize falls back to
//      a generic "something went wrong" message, since there's nothing
//      the user can act on for a genuine bug.

function humanize(s) {
  return String(s).replace(/_/g, " ").trim();
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// pg sets err.constraint to e.g. "products_slug_key" — strip the leading
// table name and trailing _key/_idx/_unique to recover just "slug".
function fieldFromConstraint(err) {
  if (err.constraint && err.table && err.constraint.startsWith(`${err.table}_`)) {
    return err.constraint.slice(err.table.length + 1).replace(/_(key|idx|unique)$/, "");
  }
  return null;
}

export function describeError(err) {
  if (!err.code && err.message) {
    return { status: 400, message: err.message };
  }

  switch (err.code) {
    case "23505": {
      // unique_violation — detail looks like: Key (slug)=(lemon) already exists.
      const detailMatch = /Key \(([^)]+)\)=\(([^)]+)\) already exists/.exec(err.detail || "");
      const field = fieldFromConstraint(err) || (detailMatch ? detailMatch[1] : null);
      const value = detailMatch ? detailMatch[2] : null;
      const fieldLabel = field ? humanize(field) : "value";
      return {
        status: 409,
        message: `Something with that ${fieldLabel}${value ? ` ("${value}")` : ""} already exists — use a different ${fieldLabel}.`,
      };
    }
    case "23503": // foreign_key_violation
      if (/is still referenced from/.test(err.detail || "")) {
        return { status: 409, message: "This can't be removed — it's still linked to other records." };
      }
      return {
        status: 400,
        message: "This refers to something that doesn't exist — it may have been deleted or not saved yet.",
      };
    case "23502": // not_null_violation
      return { status: 400, message: `${capitalize(humanize(err.column || "a required field"))} is required.` };
    case "23514": // check_violation
      return { status: 400, message: "That value isn't allowed for this field — double-check what you entered." };
    case "22P02": // invalid_text_representation
      return { status: 400, message: "One of the values entered isn't in the right format." };
    case "22003": // numeric_value_out_of_range
      return { status: 400, message: "One of the numbers entered is too large." };
    default:
      return {
        status: 500,
        message: "Something went wrong saving this. Please try again, and contact support if it keeps happening.",
      };
  }
}

// Logs the full error server-side (as every route already did) and sends
// the client a message it can actually act on. `fallback` lets a call
// site keep its existing "Failed to X" label for the case where the
// error isn't one of the recognized, more specific codes above.
export function sendError(res, err, fallback) {
  console.error(err);
  const described = describeError(err);
  const message = described.status === 500 && fallback ? fallback : described.message;
  return res.status(described.status).json({ error: message });
}
