async function run() {
  console.log("Adding to cart...");
  const addRes = await fetch('https://app.flippedpos.com/api/cart/add?schema=tenant_demo_1776953273318', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_id: 813, quantity: 1 })
  });
  
  const addJson = await addRes.json();
  console.log("Add response:", addJson);
  
  const cookies = addRes.headers.get('set-cookie');
  console.log("Cookies received:", cookies);
  
  console.log("Fetching cart...");
  const getRes = await fetch('https://app.flippedpos.com/api/cart?schema=tenant_demo_1776953273318', {
    headers: { 'Cookie': cookies ? cookies.split(';')[0] : '' }
  });
  const getJson = await getRes.json();
  console.log("Cart items:", getJson);
}

run();
