/* Razorpay Checkout script, loaded only when someone clicks Pay. */
let rzpScript;
export const loadRazorpay = () => {
  if (window.Razorpay) return Promise.resolve();
  rzpScript ||= new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = 'https://checkout.razorpay.com/v1/checkout.js';
    el.onload = resolve;
    el.onerror = () => { rzpScript = null; reject(new Error('Could not load the payment window. Please check your connection.')); };
    document.body.appendChild(el);
  });
  return rzpScript;
};
