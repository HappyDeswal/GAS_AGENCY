// Provider-only integration. Invoke from an authenticated delivery workflow, never directly from the browser.
// Twilio Verify manages generation, expiry, checking and recipient delivery for configured SMS/email channels.
export function createOtpProvider(env=process.env,transport=fetch){
 function settings(){
  if(!env.TWILIO_ACCOUNT_SID||!env.TWILIO_AUTH_TOKEN||!env.TWILIO_VERIFY_SERVICE_SID)throw Error('OTP provider is not configured. No message was sent.');
  return {url:`https://verify.twilio.com/v2/Services/${encodeURIComponent(env.TWILIO_VERIFY_SERVICE_SID)}/`,authorization:'Basic '+Buffer.from(env.TWILIO_ACCOUNT_SID+':'+env.TWILIO_AUTH_TOKEN).toString('base64')};
 }
 async function request(resource,fields){const s=settings();const response=await transport(s.url+resource,{method:'POST',headers:{Authorization:s.authorization,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(fields),signal:AbortSignal.timeout(15000),redirect:'error'});if(!response.ok)throw Error('The OTP provider rejected this request. Check provider configuration and limits.');const result=await response.json();return {reference:result.sid,status:result.status};}
 return {
  send(channel,recipient){
   if(!['sms','email'].includes(channel))throw Error('Choose SMS or email.');
   if(channel==='sms'&&!/^\+[1-9]\d{7,14}$/.test(recipient))throw Error('A valid international phone number is required.');
   if(channel==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient))throw Error('A valid email address is required.');
   return request('Verifications',{To:recipient,Channel:channel});
  },
  async check(recipient,code){
   if(!/^\d{4,10}$/.test(code))throw Error('Enter a valid OTP.');
   const result=await request('VerificationCheck',{To:recipient,Code:code});
   if(result.status!=='approved')throw Error('OTP is invalid or expired.');
   return result;
  }
 };
}
