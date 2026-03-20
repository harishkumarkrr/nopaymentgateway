import express from "express";
import path from "path";
import "dotenv/config";

const app = express();
const PORT = 3000;
const isVercel = Boolean(process.env.VERCEL);
const isProduction = process.env.NODE_ENV === "production";
const isLocalDev = !isProduction && !isVercel;

// API routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/dashboard", (req, res) => {
  res.json({
    title: "Dashboard Overview",
    content: "Welcome to your slaypay.xyz dashboard. Here you can monitor your transaction volume, manage your active products, and view real-time payment analytics."
  });
});

app.get("/api/create", (req, res) => {
  res.json({
    title: "Create Product",
    content: "Generate a new payment link by providing product details and your preferred payment methods."
  });
});

app.get("/api/playground", (req, res) => {
  res.json({
    title: "Playground",
    content: "Experience your products in a live environment. Preview your hosted storefront and test how your checkout links behave when embedded into external websites."
  });
});

app.get("/api/docs", (req, res) => {
  res.json({
    title: "Integration & API",
    content: "Comprehensive documentation for integrating slaypay.xyz into your existing workflows using our lightweight JS SDK and REST APIs."
  });
});

app.get("/api/profile", (req, res) => {
  res.json({
    title: "Profile Settings",
    content: "Manage your personal information, contact details, and account preferences."
  });
});

app.get("/api/security", (req, res) => {
  res.json({
    title: "Security Settings",
    content: "Protect your account with two-factor authentication, login notifications, and session management."
  });
});

app.get("/api/contact", (req, res) => {
  res.json({
    title: "Contact Us",
    content: "Get in touch with our team for any inquiries. Email us at support@slaypay.xyz or call us at 1-800-NOPAYMENT. Our support hours are Monday to Friday, 9 AM to 6 PM EST."
  });
});

app.get("/api/terms", (req, res) => {
  res.json({
    title: "Terms and Conditions",
    content: "By using slaypay.xyz, you agree to our terms of service. You must be at least 18 years old to use our platform. We reserve the right to suspend accounts that violate our acceptable use policy, including processing payments for prohibited goods."
  });
});

app.get("/api/privacy", (req, res) => {
  res.json({
    title: "Privacy Policy",
    content: "Your privacy is our priority. We collect only the necessary information required to process payments securely. We do not sell your personal data to third parties. All payment data is encrypted in transit and at rest."
  });
});

// Static file serving and SPA fallback
if (isProduction && !isVercel) {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

export async function startServer() {
  // Vite middleware for development
  if (isLocalDev) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  if (!isLocalDev) {
    // In production/Vercel, we don't necessarily call listen here if exported
  } else {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

// For local development with tsx
if (isLocalDev) {
  startServer();
}

export default app;
