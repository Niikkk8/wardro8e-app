import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return Response.json({ error: 'Email and OTP are required' }, { status: 400 });
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify Your wardro8e Account',
      html: `
        <div style="font-family: 'Montserrat', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0D9488; font-family: 'Playfair Display', serif; font-size: 32px; margin: 0;">wardro8e</h1>
            <p style="color: #6B7280; font-size: 16px; margin-top: 5px;">AI-Powered Fashion Discovery</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #0D9488 0%, #0F766E 100%); padding: 30px; border-radius: 24px; margin-bottom: 30px;">
            <h2 style="color: white; font-size: 24px; margin: 0 0 10px 0; text-align: center;">Welcome to wardro8e!</h2>
            <p style="color: #E6FFFA; text-align: center; margin: 0; font-size: 16px;">Verify your account to get started</p>
          </div>
          
          <div style="background-color: #F9FAFB; padding: 25px; border-radius: 16px; margin-bottom: 25px;">
            <h3 style="color: #111827; font-size: 18px; margin: 0 0 15px 0;">Hello!</h3>
            <p style="color: #4B5563; line-height: 1.6; margin: 0 0 20px 0;">
              Thank you for signing up with wardro8e. To complete your registration and start discovering fashion that matches your style, please verify your email address using the OTP below:
            </p>
            
            <div style="text-align: center; margin: 25px 0;">
              <div style="background-color: #0D9488; color: white; font-size: 32px; font-weight: bold; padding: 20px; border-radius: 12px; letter-spacing: 8px; display: inline-block;">
                ${otp}
              </div>
            </div>
            
            <p style="color: #6B7280; font-size: 14px; text-align: center; margin: 20px 0 0 0;">
              This OTP will expire in 10 minutes. If you didn't request this verification, please ignore this email.
            </p>
          </div>
          
          <div style="border-top: 1px solid #E5E7EB; padding-top: 20px; text-align: center;">
            <p style="color: #9CA3AF; font-size: 14px; margin: 0;">
              © ${new Date().getFullYear()} wardro8e. All rights reserved.<br>
              AI-Powered Fashion Discovery Platform
            </p>
          </div>
        </div>
      `,
      text: `Your wardro8e verification code is: ${otp}\n\nThis code will expire in 10 minutes.`,
    };

    await transporter.sendMail(mailOptions);

    return Response.json({ success: true, message: 'OTP sent successfully' });
  } catch (error: any) {
    console.error('Email sending failed:', error);
    return Response.json({ error: error.message || 'Failed to send OTP' }, { status: 500 });
  }
}

