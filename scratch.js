const password = "a";
const has8 = password.length >= 8; 
const hasUpper = /[A-Z]/.test(password); 
const hasNum = /[0-9]/.test(password); 
const hasSpecial = /[^A-Za-z0-9]/.test(password); 
const score = [has8, hasUpper, hasNum, hasSpecial].filter(Boolean).length; 

console.log("Score:", score);

const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-emerald-500"];
const labels = ["Weak", "Fair", "Good", "Strong"];

console.log("Score:", score);
console.log("Label:", labels[Math.max(0, score - 1)]);
for (let i = 0; i < 4; i++) {
  console.log(`i=${i}, class=${i < score ? colors[score - 1] : "bg-border-subtle"}`);
}
