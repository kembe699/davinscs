async function run() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJyb2xlIjoiYWRtaW4iLCJzY2hlbWFfbmFtZSI6InRlbmFudF9kZW1vXzE3NzY5NTMyNzMzMTgiLCJpYXQiOjE3NzcyNDk4MDR9.DJ8fCRbbUUTkra-ad0UYnSWmEX5KVx0szB8E4BZvhRc';
  
  console.log("Adding to cart as admin...");
  const addRes = await fetch('https://app.flippedpos.com/api/cart/add', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ product_id: 813, quantity: 1 })
  });
  
  const addJson = await addRes.json();
  console.log("Add response:", addJson);
  
  const cookies = addRes.headers.get('set-cookie');
  console.log("Cookies received:", cookies);
  
  console.log("Fetching cart as admin...");
  const getRes = await fetch('https://app.flippedpos.com/api/cart', {
    headers: { 
      'Cookie': cookies ? cookies.split(';')[0] : '',
      'Authorization': `Bearer ${token}`
    }
  });
  const getJson = await getRes.json();
  console.log("Cart items:", getJson);
}

run();
