import fetch from 'node-fetch';

async function testLogin() {
  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        loginId: 'admin',
        password: 'admin'
      })
    });

    if (response.ok) {
      console.log('Login successful!');
    } else {
      console.log('Login failed:', response.status, await response.text());
    }
  } catch (error) {
    console.error('Error testing login:', error);
  }
}

testLogin();
