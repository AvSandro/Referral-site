/**
 * Cloudflare Worker: NT Estate Partners Lead Generation v2
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

    // Sanitize text input to prevent injection
    function clean(str) {
      if (!str) return '';
      return String(str).replace(/[<>]/g, '').trim().slice(0, 500);
    }

    const formData = {
      name: clean(data.get("name")) || "No Name",
      email: clean(data.get("email")) || "No Email",
      phone: clean(data.get("phone")) || "No Phone",
      message: clean(data.get("message")) || "No Message",
      primaryGoal: clean(data.get("primaryGoal")) || "Not specified",
      neighborhood: clean(data.get("neighborhood")) || "Not specified",
      timeline: clean(data.get("timeline")) || "Not specified",
      budget: clean(data.get("budget")) || "Not specified"
    };

    // Validate name: at least 3 characters, letters and spaces only
    if (!formData.name || formData.name.length < 3 || !/^[a-zA-Z\s\-'.]+$/.test(formData.name)) {
      return jsonResponse({ success: false, message: 'Please enter a valid full name (at least 3 characters).' }, 400);
    }

    // Validate email: proper format with reasonable domain
    const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    if (!formData.email || !emailRegex.test(formData.email) || formData.email.length > 100) {
      return jsonResponse({ success: false, message: 'Please enter a valid email address.' }, 400);
    }

    // Validate phone: at least 7 digits present, only allowed characters
    const digitCount = (formData.phone.match(/\d/g) || []).length;
    if (!formData.phone || digitCount < 7 || !/^[0-9+\-()\s]+$/.test(formData.phone)) {
      return jsonResponse({ success: false, message: 'Please enter a valid phone number with at least 7 digits.' }, 400);
    }

    // 2. Build the text for the email.
    const emailText = `New Estate Lead!
Name: ${formData.name}
Email: ${formData.email}
Phone: ${formData.phone}
Primary Goal: ${formData.primaryGoal}
Neighborhood: ${formData.neighborhood}
Timeline: ${formData.timeline}
Budget: ${formData.budget}
Message: ${formData.message}`;

    // 3. Send the email using the SEND_EMAIL binding.
    await env.SEND_EMAIL.send({
      to: env.DESTINATION_EMAIL || "drololl06@gmail.com",
      from: env.SEND_FROM || "leads@ntestatepartners.com",
      subject: `New Lead: ${formData.name}`,
      text: emailText
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
