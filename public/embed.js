(function() {
  console.log("slaypay.xyz: Script loaded and initializing...");

  const PROJECT_ID = "nopaymentgateway";
  const DATABASE_ID = "(default)";

  // Inject CSS for hover effects safely
  function injectCSS() {
    if (document.getElementById('nopaymentgateway-styles')) return;
    const style = document.createElement('style');
    style.id = 'nopaymentgateway-styles';
    style.textContent = `
      .nopaymentgateway-container {
        display: inline-block;
        position: relative;
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        border-radius: 16px;
        overflow: hidden;
      }
      .nopaymentgateway-container:hover {
        transform: scale(1.02);
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      }
      .nopaymentgateway-container img {
        display: block;
        max-width: 100%;
        height: auto;
      }
      .nopaymentgateway-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,0);
        transition: background 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .nopaymentgateway-container:hover .nopaymentgateway-overlay {
        background: rgba(0,0,0,0.05);
      }
      .nopaymentgateway-badge {
        opacity: 0;
        transform: translateY(10px);
        transition: all 0.2s ease;
        background: rgba(255,255,255,0.9);
        backdrop-filter: blur(4px);
        padding: 8px 16px;
        border-radius: 999px;
        font-family: system-ui, sans-serif;
        font-size: 14px;
        font-weight: bold;
        color: #10b981;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
      .nopaymentgateway-container:hover .nopaymentgateway-badge {
        opacity: 1;
        transform: translateY(0);
      }
    `;
    const target = document.head || document.documentElement;
    if (target) {
      target.appendChild(style);
    }
  }

  // Parse Firestore REST API response into a normal JS object
  function parseFirestoreDocument(doc) {
    if (!doc || !doc.fields) return {};
    const fields = doc.fields;
    const data = {};
    for (const key in fields) {
      const type = Object.keys(fields[key])[0];
      if (type === 'stringValue') data[key] = fields[key][type];
      else if (type === 'doubleValue' || type === 'integerValue') data[key] = Number(fields[key][type]);
      else if (type === 'booleanValue') data[key] = fields[key][type];
      else if (type === 'timestampValue') data[key] = fields[key][type];
      else if (type === 'mapValue') {
        data[key] = parseFirestoreDocument({ fields: fields[key].mapValue.fields });
      }
    }
    return data;
  }

  async function fetchProduct(productId) {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/products/${productId}`;
    console.log("slaypay.xyz: Fetching product from", url);
    const response = await fetch(url);
    if (!response.ok) {
      const errText = await response.text();
      console.error("slaypay.xyz: Fetch failed", response.status, errText);
      throw new Error(`Product not found or unavailable. Status: ${response.status}`);
    }
    const doc = await response.json();
    console.log("slaypay.xyz: Raw Firestore doc", doc);
    return parseFirestoreDocument(doc);
  }

  function createModal(data) {
    const existing = document.getElementById('nopaymentgateway-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'nopaymentgateway-modal';
    Object.assign(overlay.style, {
      position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: '999999', fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '20px', boxSizing: 'border-box'
    });

    const modal = document.createElement('div');
    Object.assign(modal.style, {
      backgroundColor: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '400px',
      overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      display: 'flex', flexDirection: 'column', maxHeight: '90vh'
    });

    // Header
    const header = document.createElement('div');
    Object.assign(header.style, {
      padding: '20px 24px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    });
    header.innerHTML = `
      <div>
        <div style="font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Secure Checkout</div>
        <div style="font-size: 18px; font-weight: 700; color: #111827; margin: 0;">${data.merchantName || 'Merchant'}</div>
      </div>
      <button id="nopaymentgateway-close" style="background: white; border: 1px solid #e5e7eb; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #6b7280; font-size: 14px; font-weight: bold;">✕</button>
    `;

    // Body
    const body = document.createElement('div');
    Object.assign(body.style, { padding: '24px', overflowY: 'auto' });

    let currencySymbol = data.currency === 'USD' ? '$' : data.currency === 'EUR' ? '€' : data.currency === 'INR' ? '₹' : '';
    let currencySuffix = ['USD','EUR','INR'].includes(data.currency) ? '' : ` ${data.currency}`;

    let methodsHtml = '';
    
    // UPI First
    if (data.methods && data.methods.upi) {
      const upiString = `upi://pay?pa=${data.methods.upi}&pn=${encodeURIComponent(data.merchantName || 'Merchant')}&am=${data.amount}&cu=INR`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiString)}`;
      
      methodsHtml += `
        <div style="border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px; margin-bottom: 16px;">
          <div style="font-weight: 700; color: #111827; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></div> Pay via UPI
          </div>
          
          <div style="display: flex; justify-content: center; margin-bottom: 16px;">
            <div style="background: white; padding: 12px; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
              <img src="${qrUrl}" alt="UPI QR Code" style="width: 150px; height: 150px; display: block;" />
            </div>
          </div>

          <div style="background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 8px; padding: 12px; font-family: monospace; font-size: 14px; color: #374151; word-break: break-all; margin-bottom: 12px; text-align: center;">
            ${data.methods.upi}
          </div>
          <a href="${upiString}" style="display: block; text-align: center; background: #10b981; color: white; text-decoration: none; padding: 12px; border-radius: 8px; font-weight: 700; font-size: 14px; transition: background 0.2s;">Open UPI App</a>
        </div>
      `;
    }

    // Bank Transfer Next
    if (data.methods && data.methods.bank) {
      methodsHtml += `
        <div style="border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px; margin-bottom: 16px;">
          <div style="font-weight: 700; color: #111827; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: #3b82f6;"></div> Bank Transfer
          </div>
          <div style="background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 8px; padding: 12px; margin-bottom: 8px;">
            <div style="font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; margin-bottom: 4px;">Account / IBAN</div>
            <div style="font-family: monospace; font-size: 14px; color: #374151; word-break: break-all;">${data.methods.bank.account}</div>
          </div>
          <div style="background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 8px; padding: 12px;">
            <div style="font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; margin-bottom: 4px;">Routing / IFSC</div>
            <div style="font-family: monospace; font-size: 14px; color: #374151; word-break: break-all;">${data.methods.bank.ifsc}</div>
          </div>
        </div>
      `;
    }

    if (data.methods && data.methods.crypto) {
      methodsHtml += `
        <div style="border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px; margin-bottom: 16px;">
          <div style="font-weight: 700; color: #111827; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: #8b5cf6;"></div> Crypto Transfer (${data.methods.crypto.network})
          </div>
          <div style="background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 8px; padding: 12px; font-family: monospace; font-size: 12px; color: #374151; word-break: break-all;">
            ${data.methods.crypto.address}
          </div>
        </div>
      `;
    }

    body.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
        <div style="font-size: 16px; color: #4b5563; font-weight: 500;">${data.itemName}</div>
        <div style="font-size: 32px; font-weight: 900; color: #111827; line-height: 1; letter-spacing: -0.02em;">${currencySymbol}${data.amount}${currencySuffix}</div>
      </div>
      <div style="font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 16px;">Select Payment Method</div>
      ${methodsHtml}
    `;

    // Footer
    const footer = document.createElement('div');
    Object.assign(footer.style, {
      padding: '16px', backgroundColor: '#f3f4f6', borderTop: '1px solid #e5e7eb',
      textAlign: 'center', fontSize: '12px', color: '#6b7280', fontWeight: '500'
    });
    footer.innerHTML = '🔒 Secured by slaypay.xyz Hosted Checkout';

    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Events
    document.getElementById('nopaymentgateway-close').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if(e.target === overlay) overlay.remove(); };
  }

  async function initContainer(container) {
    if (container.dataset.nopaymentgatewayInitialized) return;
    container.dataset.nopaymentgatewayInitialized = "true";

    const productId = container.dataset.nopaymentgatewayId;
    if (!productId) {
      console.warn("slaypay.xyz: Container found but no data-nopaymentgateway-id attribute provided.");
      return;
    }

    console.log("slaypay.xyz: Initializing container for product", productId);

    try {
      // Fetch data
      const data = await fetchProduct(productId);
      console.log("slaypay.xyz: Parsed product data", data);
      
      if (!data.coverImage) {
        throw new Error("Product data is missing a cover image.");
      }

      // Render image inside container
      container.className = "nopaymentgateway-container";
      container.innerHTML = `
        <img src="${data.coverImage}" alt="Buy ${data.itemName || 'Product'}" />
        <div class="nopaymentgateway-overlay">
          <div class="nopaymentgateway-badge">Click to Buy</div>
        </div>
      `;

      // Attach click listener
      container.addEventListener('click', () => {
        createModal(data);
      });

    } catch (err) {
      console.error("slaypay.xyz Error:", err);
      container.innerHTML = `<div style="padding: 20px; border: 1px dashed red; color: red; font-family: sans-serif; font-size: 14px;">
        <strong>slaypay.xyz Error:</strong><br/>
        ${err.message}
      </div>`;
    }
  }

  // Scan DOM for containers
  function scanDOM() {
    const containers = document.querySelectorAll('div[data-nopaymentgateway-id]');
    if (containers.length > 0) {
      console.log(`slaypay.xyz: Found ${containers.length} containers to initialize.`);
    }
    containers.forEach(initContainer);
  }

  // Initialize CSS
  injectCSS();
  
  // Initial scan
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanDOM);
  } else {
    scanDOM();
  }

  // Watch for dynamically added containers (AJAX/React/Vue)
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        scanDOM();
      }
    }
  });
  observer.observe(document.body || document.documentElement, { childList: true, subtree: true });

})();
