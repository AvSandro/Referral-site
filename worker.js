/**
 * Cloudflare Worker: NT Estate Partners Lead Generation
 * - Serves HTML on GET requests
 * - Processes referral form submissions on POST requests
 * - Sends lead details to ops@ntestatepartners.com
 */

// No imports needed — uses MailChannels API (free from Cloudflare Workers)

export default {
  async fetch(request, env) {
    
    // ADD THIS LINE HERE:
    if (request.method === "POST") {
      try {
        const formData = await request.formData();
        
        // EVERYTHING that uses formData.get() goes INSIDE these curly braces { }
        const name = formData.get("name"); 
        
        // ... all your email sending code ...
        
        return new Response("Success!");
      } catch (err) {
        return new Response(err.message, { status: 500 });
      }
    } // END OF THE POST CHECK

    // ADD THIS FOR THE HOME PAGE (GET):
    return new Response("NT Estate Partners is Live!", {
      headers: { "Content-Type": "text/html" }
    });
  }
};


/**
 * Serve HTML for GET requests
 */
async function handleGetRequest(env) {
  // Read the HTML from your project files
  // For Cloudflare Workers, you'll need to embed HTML or use KV storage
  // In this example, we'll serve from KV or inline it
  
  const html = await env.ASSETS.get('index.html');
  
  if (html) {
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  // Fallback if no KV binding - return basic response
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
    if (request.method === 'POST') {
      // Parse form data only for POST requests.
      const contentType = request.headers.get('Content-Type');
      let formData = {};

      if (contentType && contentType.includes('application/x-www-form-urlencoded')) {
        const text = await request.text();
        const params = new URLSearchParams(text);
        formData = Object.fromEntries(params.entries());
      } else if (contentType && contentType.includes('multipart/form-data')) {
        const data = await request.formData();
        formData = Object.fromEntries(data.entries());
      } else if (contentType && contentType.includes('application/json')) {
        formData = await request.json();
      }

      // Validate required fields
      const requiredFields = ['name', 'email', 'phone'];
      for (const field of requiredFields) {
        if (!formData[field]) {
          return jsonResponse(
            { success: false, message: `Missing required field: ${field}` },
            400
          );
        }
      }

      // Build email content
      const emailContent = buildEmailContent(formData);

      // Send email via MailChannels
      const emailResponse = await sendEmail(
        env,
        env.DESTINATION_EMAIL || 'drololl06@gmail.com',
        `New Estate Referral from ${formData.name}`,
        emailContent
      );

      if (!emailResponse.success) {
        throw new Error('Failed to send email');
      }

      // Return success response
      return jsonResponse({
        success: true,
        message: 'Your estate referral is being processed. Our ops team will connect with a vetted partner within 48 hours.'
      });
    }

    return jsonResponse({ success: false, message: 'Method Not Allowed' }, 405);

  } catch (error) {
    console.error('Form submission error:', error);
    return jsonResponse(
      { 
        success: false, 
        message: 'An error occurred while processing your referral. Please try again or contact ops@ntestatepartners.com.' 
      },
      500
    );
  }
}

/**
 * Build formatted email content from form data
 */
function buildEmailContent(formData) {
  return `
New Estate Referral Submission

Name: ${formData.name || 'N/A'}
Email: ${formData.email || 'N/A'}
Phone: ${formData.phone || 'N/A'}
Service Type: ${formData.serviceType || 'N/A'}
Budget: ${formData.budget || 'N/A'}
Project Details: ${formData.projectDetails || 'N/A'}

---
Submitted at: ${new Date().toISOString()}
Source: ntestatepartners.com
  `;
}

/**
 * Send email via Cloudflare Email Binding
 */
async function sendEmail(env, to, subject, content) {
  try {
    const fromAddr = env.SEND_FROM || 'leads@ntestatepartners.com';

    const message = new EmailMessage({
      from: fromAddr,
      to: to,
      subject: subject,
      text: content,
      html: formatEmailHtml(content)
    });

    await env.SEND_EMAIL.send(message);
    return { success: true };

  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Format email content as HTML
 */
function formatEmailHtml(content) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { color: #000; font-size: 18px; font-weight: bold; margin-bottom: 20px; }
        .content { white-space: pre-line; color: #666; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">New Estate Referral</div>
        <div class="content">${content}</div>
        <div class="footer">
          <p>NT Estate Partners Lead Management System</p>
          <p>ntestatepartners.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Helper: return JSON response
 */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
