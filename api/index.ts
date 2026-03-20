type ContentResponse = {
  title: string;
  content: string;
};

const contentByTab: Record<string, ContentResponse> = {
  dashboard: {
    title: "Dashboard Overview",
    content:
      "Welcome to your slaypay.xyz dashboard. Here you can monitor your transaction volume, manage your active products, and view real-time payment analytics.",
  },
  create: {
    title: "Create Product",
    content:
      "Generate a new payment link by providing product details and your preferred payment methods.",
  },
  playground: {
    title: "Playground",
    content:
      "Experience your products in a live environment. Preview your hosted storefront and test how your checkout links behave when embedded into external websites.",
  },
  docs: {
    title: "Integration & API",
    content:
      "Comprehensive documentation for integrating slaypay.xyz into your existing workflows using our lightweight JS SDK and REST APIs.",
  },
  profile: {
    title: "Profile Settings",
    content:
      "Manage your personal information, contact details, and account preferences.",
  },
  security: {
    title: "Security Settings",
    content:
      "Protect your account with two-factor authentication, login notifications, and session management.",
  },
  contact: {
    title: "Contact Us",
    content:
      "Get in touch with our team for any inquiries. Email us at support@slaypay.xyz or call us at 1-800-NOPAYMENT. Our support hours are Monday to Friday, 9 AM to 6 PM EST.",
  },
  terms: {
    title: "Terms and Conditions",
    content:
      "By using slaypay.xyz, you agree to our terms of service. You must be at least 18 years old to use our platform. We reserve the right to suspend accounts that violate our acceptable use policy, including processing payments for prohibited goods.",
  },
  privacy: {
    title: "Privacy Policy",
    content:
      "Your privacy is our priority. We collect only the necessary information required to process payments securely. We do not sell your personal data to third parties. All payment data is encrypted in transit and at rest.",
  },
};

export default function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const pathname = new URL(req.url || "/", "http://localhost").pathname;

  if (pathname === "/api/health") {
    return res.status(200).json({ status: "ok" });
  }

  const tab = pathname.replace(/^\/api\//, "");
  const payload = contentByTab[tab];

  if (!payload) {
    return res.status(404).json({ error: "Not Found" });
  }

  return res.status(200).json(payload);
}
