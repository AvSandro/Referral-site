/**
 * Cloudflare Worker: NT Estate Partners Lead Generation
 * - Serves HTML on GET requests
 * - Processes referral form submissions on POST requests
 * - Sends lead details to ops@ntestatepartners.com
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS' && url.pathname === '/submit-referral') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    // 1. Handle referral submissions.
    if (request.method === "POST" && url.pathname === "/submit-referral") {
      return handlePostRequest(request, env);
    }

    // 2. Serve static files for all non-form routes.
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    // 3. Last-resort fallback if assets binding is unavailable.
    return handleGetRequest(env);
  }
};

/**
 * Serve HTML for GET requests
 */
async function handleGetRequest(env) {
  // Assets binding is unavailable, so return a simple fallback response.
  return new Response('Welcome to NT Estate Partners', {
    status: 200,
    headers: { 'Content-Type': 'text/html' }
  });
}

/**
 * Handle form submissions (POST requests)
 */
async function handlePostRequest(request, env) {
  try {
    const data = await request.formData();
    const formData = {
      name: data.get("name") || "No Name",
      email: data.get("email") || "No Email",
      phone: data.get("phone") || "No Phone",
      message: data.get("message") || "No Message"
    };

    // Validate required fields.
    const requiredFields = ['name', 'email', 'phone'];
    for (const field of requiredFields) {
      if (!formData[field] || formData[field].startsWith('No ')) {
        return jsonResponse({ success: false, message: `Missing required field: ${field}` }, 400);
      }
    }

    // 2. Build the text for the email.
    const emailText = `New Estate Lead!
Name: ${formData.name}
Email: ${formData.email}
Phone: ${formData.phone}
Message: ${formData.message}`;

    // 3. Send the email using the SEND_EMAIL binding.
    await env.SEND_EMAIL.send({
      to: env.DESTINATION_EMAIL || "drololl06@gmail.com",
      from: env.SEND_FROM || "leads@ntestatepartners.com",
      subject: `New Lead: ${formData.name}`,
      content: [{ type: "text/plain", value: emailText }]
    });


    return jsonResponse(
      {
        success: true,
        message: 'Your estate referral is being processed. Our ops team will connect with a vetted partner within 48 hours.'
      },
      200
    );

  } catch (err) {
    return jsonResponse(
      {
        success: false,
        message: err && err.message
          ? err.message
          : 'An error occurred while processing your referral. Please try again.'
      },
      500
    );
  }
}

/**
 * Helper: return JSON response
 */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: {
      ...corsHeaders(),
      'Content-Type': 'application/json'
    }
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}
