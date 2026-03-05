/**
 * Cloudflare Worker: NT Estate Partners Lead Generation
 * - Serves HTML on GET requests
 * - Processes referral form submissions on POST requests
 * - Sends lead details to ops@ntestatepartners.com
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle GET requests - serve HTML
    if (request.method === 'GET') {
      return handleGetRequest(env);
    }

    // Handle POST requests - process form submission
    if (request.method === 'POST' && url.pathname === '/submit-referral') {
      return handlePostRequest(request, env);
    }

    // Default 404
    return new Response('Not Found', { status: 404 });
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
    // Parse form data
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

    // Send email via Cloudflare Email Routing
    const emailResponse = await sendEmail(
      env,
      'ops@ntestatepartners.com',
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
 * Send email via Cloudflare Email Routing Worker
 * 
 * Note: You need to set up Cloudflare Email Routing first:
 * 1. Configure a forwarding rule in Cloudflare Dashboard
 * 2. Set the binding in wrangler.toml:
 *    [[env.production.bindings]]
 *    name = "SEND_EMAIL"
 *    type = "service"
 *    service = "send-email"
 *    environment = "production"
 */
async function sendEmail(env, to, subject, content) {
  try {
    // Option 1: Using Cloudflare Email Routing (if available)
    if (env.SEND_EMAIL) {
      await env.SEND_EMAIL.sendEmail({
        to: to,
        from: 'noreply@ntestatepartners.com',
        subject: subject,
        html: formatEmailHtml(content),
        text: content
      });
      return { success: true };
    }

    // Option 2: Using a third-party API (SendGrid, Mailgun, etc.)
    // Example with SendGrid:
    if (env.SENDGRID_API_KEY) {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: 'noreply@ntestatepartners.com' },
          subject: subject,
          content: [{ type: 'text/html', value: formatEmailHtml(content) }]
        })
      });

      if (!response.ok) {
        throw new Error(`SendGrid error: ${response.statusText}`);
      }
      return { success: true };
    }

    // Option 3: Using Mailgun
    if (env.MAILGUN_API_KEY && env.MAILGUN_DOMAIN) {
      const response = await fetch(
        `https://api.mailgun.net/v3/${env.MAILGUN_DOMAIN}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`api:${env.MAILGUN_API_KEY}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            from: 'NT Estate Partners <noreply@ntestatepartners.com>',
            to: to,
            subject: subject,
            html: formatEmailHtml(content)
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Mailgun error: ${response.statusText}`);
      }
      return { success: true };
    }

    // If no email service is configured, log and return mock success
    console.warn('No email service configured. Email would have been sent to:', to);
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
