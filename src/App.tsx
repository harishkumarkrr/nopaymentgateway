import React, { useState, useRef, useEffect } from 'react';
import { 
  CreditCard, 
  Code, 
  ShoppingBag, 
  Copy, 
  Check, 
  Wallet, 
  Building2, 
  Smartphone,
  LayoutDashboard,
  Image as ImageIcon,
  Terminal,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
  CheckCircle2,
  Menu,
  X,
  Upload,
  AlertCircle,
  Lock,
  LogOut,
  Trash2,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, loginWithGoogle, logout } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, where, serverTimestamp, onSnapshot } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    tenantId: string;
    providerInfo: {
      providerId: string;
      displayName: string;
      email: string;
      photoUrl: string;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || '',
      email: auth.currentUser?.email || '',
      emailVerified: auth.currentUser?.emailVerified || false,
      isAnonymous: auth.currentUser?.isAnonymous || false,
      tenantId: auth.currentUser?.tenantId || '',
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName || '',
        email: provider.email || '',
        photoUrl: provider.photoURL || ''
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let errorMsg = this.state.error?.message || 'An unknown error occurred';
      try {
        const parsed = JSON.parse(errorMsg);
        if (parsed.error) errorMsg = parsed.error;
      } catch (e) {}

      return (
        <div className="min-h-screen bg-white flex items-center justify-center p-6 text-zinc-900">
          <div className="max-w-md w-full bg-red-500/10 border border-red-500/20 rounded-3xl p-8 text-center">
            <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-red-400 mb-2">Something went wrong</h1>
            <p className="text-zinc-500 text-sm mb-6">{errorMsg}</p>
            <button onClick={() => window.location.reload()} className="bg-red-500/20 text-red-400 px-6 py-2 rounded-xl text-sm font-medium hover:bg-red-500/30">
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

type Tab = 'dashboard' | 'create' | 'demo' | 'test-embed' | 'docs' | 'professional' | 'contact' | 'terms' | 'privacy';

interface PaymentPayload {
  merchantId: string;
  merchantName: string;
  itemName: string;
  amount: number;
  currency: string;
  coverImage: string;
  methods: {
    upi?: string;
    bank?: { account: string; ifsc: string };
    crypto?: { address: string; network: string };
  };
  createdAt?: any;
}

function MainApp() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Page Content State
  const [pageContent, setPageContent] = useState<{title: string, content: string} | null>(null);

  useEffect(() => {
    if (['professional', 'contact', 'terms', 'privacy'].includes(activeTab)) {
      setPageContent(null);
      fetch(`/api/${activeTab}`)
        .then(res => res.json())
        .then(data => setPageContent(data))
        .catch(err => console.error(err));
    }
  }, [activeTab]);

  // Products State
  const [products, setProducts] = useState<{id: string, data: PaymentPayload}[]>([]);

  // Form State
  const [merchantName, setMerchantName] = useState('');
  const [itemName, setItemName] = useState('');
  const [amount, setAmount] = useState('120');
  const [currency, setCurrency] = useState('USD');
  
  const [upiId, setUpiId] = useState('');
  const [bankAcc, setBankAcc] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [cryptoAddress, setCryptoAddress] = useState('');
  
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [resultProductId, setResultProductId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Demo Store State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutData, setCheckoutData] = useState<PaymentPayload | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Test Embed State
  const [testProductId, setTestProductId] = useState<string>('');
  const embedContainerRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setMerchantName(currentUser.displayName || 'My Store');
        // Ensure user doc exists
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              merchantName: currentUser.displayName || 'My Store',
              createdAt: serverTimestamp()
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`);
        }
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isAuthReady && user) {
      const q = query(collection(db, 'products'), where('merchantId', '==', user.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const prods: {id: string, data: PaymentPayload}[] = [];
        snapshot.forEach((doc) => {
          prods.push({ id: doc.id, data: doc.data() as PaymentPayload });
        });
        setProducts(prods);
        if (prods.length > 0 && !testProductId) {
          setTestProductId(prods[0].id);
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'products');
      });
      return () => unsubscribe();
    } else {
      setProducts([]);
    }
  }, [isAuthReady, user]);

  // Effect to load the real embed script in the Test Embed tab
  useEffect(() => {
    if (activeTab === 'test-embed' && testProductId && embedContainerRef.current) {
      // Clear previous
      embedContainerRef.current.innerHTML = '';
      
      // Create the div
      const div = document.createElement('div');
      div.setAttribute('data-pixelpay-id', testProductId);
      embedContainerRef.current.appendChild(div);

      // Load the script dynamically
      const script = document.createElement('script');
      script.src = '/embed.js?t=' + new Date().getTime(); // cache buster
      script.async = true;
      document.body.appendChild(script);

      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
        // Also remove the modal if it was left open
        const modal = document.getElementById('pixelpay-modal');
        if (modal) modal.remove();
      };
    }
  }, [activeTab, testProductId]);

  // Clear result when form changes
  useEffect(() => {
    setResultProductId(null);
  }, [merchantName, itemName, amount, currency, upiId, bankAcc, bankIfsc, cryptoAddress, coverImage]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload a valid image file.');
        return;
      }
      if (file.size > 500 * 1024) {
        setError('Image is too large. Please upload an image smaller than 500KB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setCoverImage(event.target?.result as string);
        setResultProductId(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!user) {
      setError('Please sign in to create a product.');
      return;
    }
    if (!coverImage) {
      setError('Please upload a product image.');
      return;
    }
    if (!upiId && !bankAcc && !cryptoAddress) {
      setError('Please provide at least one payment method.');
      return;
    }
    if (!itemName || !amount) {
      setError('Please provide product name and amount.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const payload: PaymentPayload = {
        merchantId: user.uid,
        merchantName: merchantName,
        itemName: itemName,
        amount: parseFloat(amount),
        currency,
        coverImage,
        methods: {},
        createdAt: serverTimestamp()
      };

      if (upiId) payload.methods.upi = upiId;
      if (bankAcc) payload.methods.bank = { account: bankAcc, ifsc: bankIfsc };
      if (cryptoAddress) payload.methods.crypto = { address: cryptoAddress, network: 'ETH/ERC20' };

      const newDocRef = doc(collection(db, 'products'));
      await setDoc(newDocRef, payload);

      setResultProductId(newDocRef.id);
      
      // Reset form
      setItemName('');
      setAmount('120');
      setCoverImage(null);
      
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, 'products');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteDoc(doc(db, 'products', id));
        if (resultProductId === id) setResultProductId(null);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
      }
    }
  };

  const handleImageClick = async (product: PaymentPayload) => {
    setCheckoutData(product);
    setIsCheckoutOpen(true);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const NavItem = ({ icon: Icon, label, tab }: { icon: any, label: string, tab: Tab }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
        activeTab === tab 
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
          : 'text-zinc-500 hover:bg-black/5 hover:text-zinc-800 border border-transparent'
      }`}
    >
      <Icon size={18} />
      <span className="font-medium text-sm">{label}</span>
    </button>
  );

  if (!isAuthReady) {
    return <div className="min-h-screen bg-white flex items-center justify-center text-zinc-900">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white text-zinc-900 selection:bg-emerald-500/30 font-sans overflow-y-auto">
        {/* Navigation */}
        <nav className="fixed top-0 w-full z-50 border-b border-black/5 bg-white/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <CreditCard size={18} className="text-zinc-900" />
              </div>
              <span className="font-bold text-lg tracking-tight">PixelPay</span>
            </div>
            <button onClick={loginWithGoogle} className="text-sm font-medium hover:text-emerald-400 transition-colors">
              Sign In
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <main className="pt-32 pb-16 px-6 relative">
          {/* Background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none"></div>
          
          <div className="max-w-7xl mx-auto text-center relative z-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/5 border border-black/10 text-xs font-medium text-zinc-600 mb-8">
                <Zap size={14} className="text-emerald-400" />
                <span>Now supporting UPI & Crypto</span>
              </div>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-6 leading-[1.1]">
                Payments, <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400">reimagined.</span>
              </h1>
              <p className="text-lg md:text-xl text-zinc-500 max-w-2xl mx-auto mb-10 leading-relaxed">
                The ultimate hosted checkout for creators and indie hackers. Accept UPI, Bank Transfers, and Crypto with zero platform fees.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button onClick={loginWithGoogle} className="w-full sm:w-auto px-8 py-4 bg-black text-white rounded-full font-bold text-sm hover:bg-zinc-800 transition-all flex items-center justify-center gap-2">
                  Start Processing <ArrowRight size={16} />
                </button>
                <button onClick={loginWithGoogle} className="w-full sm:w-auto px-8 py-4 bg-black/5 text-zinc-900 border border-black/10 rounded-full font-bold text-sm hover:bg-black/10 transition-all flex items-center justify-center gap-2">
                  <Code size={16} /> View Documentation
                </button>
              </div>
            </motion.div>

            {/* Features Grid */}
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }} className="mt-32 grid md:grid-cols-3 gap-6 text-left">
              <div className="p-8 rounded-3xl bg-gradient-to-b from-white/5 to-transparent border border-black/10 hover:border-black/20 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-6 border border-emerald-500/20">
                  <Globe size={24} className="text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold mb-3">Global Reach</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">Accept payments from anywhere in the world. Support for local payment methods like UPI alongside global crypto networks.</p>
              </div>
              <div className="p-8 rounded-3xl bg-gradient-to-b from-white/5 to-transparent border border-black/10 hover:border-black/20 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/20 flex items-center justify-center mb-6 border border-teal-500/20">
                  <ShieldCheck size={24} className="text-teal-400" />
                </div>
                <h3 className="text-xl font-bold mb-3">Self-Custodial</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">Funds go directly to your accounts. We never hold your money, meaning zero payout delays and zero platform risk.</p>
              </div>
              <div className="p-8 rounded-3xl bg-gradient-to-b from-white/5 to-transparent border border-black/10 hover:border-black/20 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-6 border border-emerald-500/20">
                  <Code size={24} className="text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold mb-3">Drop-in Embed</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">Integrate our beautiful checkout modal into any website with just two lines of code. Works with React, Webflow, and more.</p>
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-800 font-sans flex overflow-hidden selection:bg-emerald-500/30">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside 
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            className="w-[280px] border-r border-black/10 bg-zinc-50 flex flex-col z-20 absolute md:relative h-full"
          >
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <CreditCard size={18} className="text-zinc-900" />
                </div>
                <span className="font-bold text-lg tracking-tight text-zinc-900">PixelPay</span>
              </div>
              <button className="md:hidden text-zinc-500 hover:text-zinc-900" onClick={() => setIsSidebarOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
              <NavItem icon={LayoutDashboard} label="Dashboard" tab="dashboard" />
              <NavItem icon={ImageIcon} label="Create Product" tab="create" />
              <NavItem icon={ShoppingBag} label="Storefront Demo" tab="demo" />
              <NavItem icon={Play} label="Live Embed Tester" tab="test-embed" />
              <NavItem icon={Code} label="Integration & API" tab="docs" />
              
              <div className="pt-6 pb-2 px-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Company</div>
              <NavItem icon={Building2} label="Professional" tab="professional" />
              <NavItem icon={Globe} label="Contact" tab="contact" />
              <NavItem icon={ShieldCheck} label="Terms & Conditions" tab="terms" />
              <NavItem icon={Lock} label="Privacy Policy" tab="privacy" />
            </nav>

            <div className="p-4">
              <div className="bg-white border border-black/5 rounded-2xl p-4 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                    {user.displayName?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm text-zinc-900 font-medium truncate">{user.displayName}</p>
                    <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                  </div>
                </div>
                <button onClick={logout} className="w-full py-2 bg-black/5 hover:bg-black/10 rounded-lg text-xs font-medium text-zinc-600 flex items-center justify-center gap-2 transition-colors">
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative">
        <header className="h-16 border-b border-black/10 flex items-center justify-between px-6 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="text-zinc-500 hover:text-zinc-900">
                <Menu size={20} />
              </button>
            )}
            <h1 className="font-medium text-zinc-900 capitalize">
              {activeTab === 'create' ? 'Create Product' : 
               activeTab === 'demo' ? 'Live Storefront Demo' : 
               activeTab === 'test-embed' ? 'Live Embed Tester' : 
               activeTab === 'professional' ? 'Professional' :
               activeTab === 'contact' ? 'Contact' :
               activeTab === 'terms' ? 'Terms & Conditions' :
               activeTab === 'privacy' ? 'Privacy Policy' :
               activeTab}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2">
              <ShieldCheck size={14} /> Secure Hosted Checkout
            </div>
          </div>
        </header>

        <div className="p-6 md:p-10 max-w-6xl mx-auto w-full">
          
          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-zinc-900">Your Products</h2>
                <button onClick={() => setActiveTab('create')} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-500 transition-colors flex items-center gap-2">
                  <ImageIcon size={16} /> New Product
                </button>
              </div>

              {products.length === 0 ? (
                <div className="bg-white border border-black/5 rounded-3xl p-12 text-center">
                  <ShoppingBag size={48} className="text-zinc-700 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-zinc-900 mb-2">No Products Yet</h3>
                  <p className="text-zinc-500 mb-6">Create your first product to get your embed code.</p>
                  <button onClick={() => setActiveTab('create')} className="bg-black/10 text-zinc-900 px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-black/20 transition-colors">
                    Create Product
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <div key={product.id} className="bg-white border border-black/5 rounded-2xl overflow-hidden group">
                      <div className="aspect-video w-full relative overflow-hidden bg-black">
                        <img src={product.data.coverImage} alt={product.data.itemName} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <button 
                            onClick={() => {
                              setResultProductId(product.id);
                              setActiveTab('create');
                            }}
                            className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-500"
                            title="Get Embed Code"
                          >
                            <Code size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteProduct(product.id)}
                            className="bg-red-500/20 text-red-400 p-2 rounded-lg hover:bg-red-500/40"
                            title="Delete Product"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-zinc-900 truncate pr-4">{product.data.itemName}</h3>
                          <span className="font-mono text-emerald-400 font-medium">
                            {product.data.currency === 'USD' ? '$' : product.data.currency === 'EUR' ? '€' : product.data.currency === 'INR' ? '₹' : ''}
                            {product.data.amount}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 font-mono truncate">ID: {product.id}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* CREATE TAB */}
          {activeTab === 'create' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Form Column */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-white border border-black/5 rounded-3xl p-6 md:p-8">
                  <h3 className="text-lg font-medium text-zinc-900 mb-6 flex items-center gap-2">
                    <ShoppingBag size={20} className="text-emerald-400" />
                    Product Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2 md:col-span-1">
                      <label className="text-xs font-medium text-zinc-500">Merchant / Store Name</label>
                      <input
                        type="text"
                        value={merchantName}
                        onChange={(e) => setMerchantName(e.target.value)}
                        className="w-full bg-white border border-black/10 rounded-xl py-2.5 px-4 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                    <div className="space-y-2 col-span-2 md:col-span-1">
                      <label className="text-xs font-medium text-zinc-500">Product Name</label>
                      <input
                        type="text"
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        className="w-full bg-white border border-black/10 rounded-xl py-2.5 px-4 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-zinc-500">Amount</label>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-white border border-black/10 rounded-xl py-2.5 px-4 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-zinc-500">Currency</label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full bg-white border border-black/10 rounded-xl py-2.5 px-4 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="INR">INR (₹)</option>
                        <option value="GBP">GBP (£)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-black/5 rounded-3xl p-6 md:p-8">
                  <h3 className="text-lg font-medium text-zinc-900 mb-6 flex items-center gap-2">
                    <Wallet size={20} className="text-emerald-400" />
                    Payment Routing (Fill at least one)
                  </h3>
                  
                  <div className="space-y-6">
                    {/* UPI */}
                    <div className="p-4 rounded-2xl bg-zinc-50 border border-black/5">
                      <div className="flex items-center gap-2 mb-3">
                        <Smartphone size={16} className="text-emerald-400" />
                        <span className="text-sm font-medium text-zinc-800">UPI (India)</span>
                      </div>
                      <input
                        type="text"
                        placeholder="merchant@upi"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="w-full bg-white border border-black/10 rounded-xl py-2.5 px-4 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>

                    {/* Bank */}
                    <div className="p-4 rounded-2xl bg-zinc-50 border border-black/5">
                      <div className="flex items-center gap-2 mb-3">
                        <Building2 size={16} className="text-blue-400" />
                        <span className="text-sm font-medium text-zinc-800">Bank Transfer (Wire/ACH)</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Account Number / IBAN"
                          value={bankAcc}
                          onChange={(e) => setBankAcc(e.target.value)}
                          className="w-full bg-white border border-black/10 rounded-xl py-2.5 px-4 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                        <input
                          type="text"
                          placeholder="Routing / IFSC / SWIFT"
                          value={bankIfsc}
                          onChange={(e) => setBankIfsc(e.target.value)}
                          className="w-full bg-white border border-black/10 rounded-xl py-2.5 px-4 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                      </div>
                    </div>

                    {/* Crypto */}
                    <div className="p-4 rounded-2xl bg-zinc-50 border border-black/5">
                      <div className="flex items-center gap-2 mb-3">
                        <Code size={16} className="text-teal-400" />
                        <span className="text-sm font-medium text-zinc-800">Cryptocurrency (ERC20/ETH)</span>
                      </div>
                      <input
                        type="text"
                        placeholder="0x..."
                        value={cryptoAddress}
                        onChange={(e) => setCryptoAddress(e.target.value)}
                        className="w-full bg-white border border-black/10 rounded-xl py-2.5 px-4 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Image & Action Column */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white border border-black/5 rounded-3xl p-6 md:p-8 sticky top-24">
                  <h3 className="text-lg font-medium text-zinc-900 mb-4 flex items-center gap-2">
                    <ImageIcon size={20} className="text-emerald-400" />
                    Product Image
                  </h3>
                  
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-black/10 rounded-2xl p-8 text-center cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group mb-6"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/png, image/jpeg"
                      className="hidden"
                    />
                    {coverImage ? (
                      <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-black">
                        <img src={coverImage} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <p className="text-sm font-medium text-zinc-900">Change Image</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 py-10">
                        <div className="w-14 h-14 rounded-full bg-black/5 flex items-center justify-center text-zinc-500 group-hover:text-emerald-400 group-hover:scale-110 transition-all">
                          <Upload size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-600">Upload product photo</p>
                          <p className="text-xs text-zinc-500 mt-1">Max 500KB</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6 flex items-start gap-2">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      <p>{error}</p>
                    </div>
                  )}

                  <button
                    disabled={!coverImage || isProcessing}
                    onClick={handleGenerate}
                    className={`w-full py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      (!coverImage || isProcessing)
                        ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)]'
                    }`}
                  >
                    {isProcessing ? (
                      <div className="w-5 h-5 border-2 border-black/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Code size={18} /> Save & Get Embed Code
                      </>
                    )}
                  </button>

                  {resultProductId && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 pt-6 border-t border-black/10 space-y-4">
                      <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                        <h4 className="text-emerald-400 font-bold flex items-center gap-2 mb-2"><CheckCircle2 size={18}/> Ready to Embed</h4>
                        <p className="text-sm text-emerald-200/70 mb-4">Your product is saved securely. Copy the code below to add it to your site.</p>
                        
                        <div className="relative">
                          <pre className="bg-zinc-100 border border-black/10 rounded-xl p-4 overflow-x-auto text-xs font-mono text-zinc-800">
                            {`<script src="${window.location.origin}/embed.js" async></script>\n<div \n  data-pixelpay-id="${resultProductId}" \n></div>`}
                          </pre>
                          <button 
                            onClick={() => copyToClipboard(`<script src="${window.location.origin}/embed.js" async></script>\n<div data-pixelpay-id="${resultProductId}"></div>`, 'embed_create')}
                            className="absolute top-2 right-2 p-2 bg-black/10 hover:bg-black/20 rounded-lg text-zinc-600 transition-colors"
                          >
                            {copiedField === 'embed_create' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>
                      <button onClick={() => setActiveTab('demo')} className="w-full py-3 bg-black/5 hover:bg-black/10 text-zinc-900 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
                        <ShoppingBag size={16} /> Test in Demo Store
                      </button>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* DEMO STORE TAB */}
          {activeTab === 'demo' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
              
              {products.length === 0 ? (
                <div className="text-center py-20">
                  <ShoppingBag size={48} className="text-zinc-700 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-zinc-900 mb-2">No Products Available</h3>
                  <p className="text-zinc-500 mb-6">Go to the Create tab to add your first product.</p>
                  <button onClick={() => setActiveTab('create')} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium">
                    Create Product
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-start gap-3">
                    <CheckCircle2 size={20} className="text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-emerald-300 mb-1">Live Storefront Simulation</h4>
                      <p className="text-xs text-emerald-200/70">Below is a simulation of how your products will look and function on your website. Click a product to experience the customer checkout flow.</p>
                    </div>
                  </div>

                  {/* Mock E-commerce Site */}
                  <div className="bg-white rounded-[2rem] overflow-hidden shadow-2xl">
                    {/* Mock Browser Chrome */}
                    <div className="bg-zinc-100 border-b border-zinc-200 px-4 py-3 flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                        <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                        <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                      </div>
                      <div className="mx-auto bg-white border border-zinc-200 rounded-md px-3 py-1 text-[10px] text-zinc-500 font-mono flex items-center gap-2">
                        <Lock size={10} /> https://{user.displayName?.toLowerCase().replace(/\s+/g, '') || 'store'}.com/shop
                      </div>
                    </div>

                    {/* Mock Store Content */}
                    <div className="bg-white p-8 md:p-12 text-zinc-900 grid grid-cols-1 md:grid-cols-2 gap-8">
                      {products.map((product) => (
                        <div key={product.id} className="group cursor-pointer" onClick={() => handleImageClick(product.data)}>
                          <div className="relative overflow-hidden rounded-2xl mb-4 bg-zinc-100 aspect-square">
                            <img 
                              src={product.data.coverImage} 
                              alt={product.data.itemName} 
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" 
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg text-sm font-bold text-emerald-600 flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all">
                                <CreditCard size={16} /> Click to Buy
                              </div>
                            </div>
                          </div>
                          <h2 className="text-xl font-black tracking-tight mb-1">{product.data.itemName}</h2>
                          <p className="text-lg font-medium text-zinc-500">
                            {product.data.currency === 'USD' ? '$' : product.data.currency === 'EUR' ? '€' : product.data.currency === 'INR' ? '₹' : '£'}{product.data.amount}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* LIVE EMBED TESTER TAB */}
          {activeTab === 'test-embed' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="bg-white rounded-3xl p-8 md:p-12 text-center text-black shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                <h2 className="text-3xl font-black tracking-tight mb-4">My External Website</h2>
                <p className="text-zinc-500 mb-8 max-w-lg mx-auto">
                  This tab simulates your actual external website. It loads the real <code>embed.js</code> script exactly as your customers will see it.
                </p>

                {products.length === 0 ? (
                  <div className="p-6 bg-zinc-100 rounded-2xl text-zinc-500">
                    Please create a product first to test the embed.
                  </div>
                ) : (
                  <div className="max-w-md mx-auto">
                    <div className="mb-8 text-left">
                      <label className="block text-sm font-bold text-zinc-700 mb-2">Select Product to Test:</label>
                      <select 
                        value={testProductId}
                        onChange={(e) => setTestProductId(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 px-4 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.data.itemName} - {p.data.currency} {p.data.amount}</option>
                        ))}
                      </select>
                    </div>

                    <div className="p-8 bg-zinc-50 border border-zinc-200 rounded-3xl">
                      <h3 className="text-lg font-bold text-zinc-900 mb-6">Featured Product</h3>
                      
                      {/* THIS IS WHERE THE REAL EMBED SCRIPT INJECTS THE UI */}
                      <div ref={embedContainerRef} className="mx-auto max-w-[250px] min-h-[200px] flex items-center justify-center">
                        <div className="animate-pulse text-zinc-500 text-sm">Loading embed...</div>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* DOCS TAB */}
          {activeTab === 'docs' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-8">
              <div className="bg-white border border-black/5 rounded-3xl p-8">
                <h2 className="text-2xl font-bold text-zinc-900 mb-6 flex items-center gap-3">
                  <Terminal size={24} className="text-emerald-400" />
                  Integration Guide
                </h2>
                
                <div className="space-y-8">
                  <section>
                    <h3 className="text-lg font-medium text-zinc-900 mb-3">1. Create a Product</h3>
                    <p className="text-zinc-500 text-sm mb-4">Use the Create tab to upload your product image and set your payment details. PixelPay will securely host this data.</p>
                  </section>

                  <section>
                    <h3 className="text-lg font-medium text-zinc-900 mb-3">2. Copy the Embed Code</h3>
                    <p className="text-zinc-500 text-sm mb-4">Once saved, copy the provided HTML snippet. It contains a lightweight script and a div tag with your unique product ID.</p>
                  </section>

                  <section>
                    <h3 className="text-lg font-medium text-zinc-900 mb-3">3. Paste into your Website</h3>
                    <p className="text-zinc-500 text-sm mb-4">Paste the snippet into your Shopify, WordPress, Webflow, or custom React app. The script will automatically fetch the product data and render an interactive checkout button.</p>
                  </section>
                </div>
              </div>
            </motion.div>
          )}

          {['professional', 'contact', 'terms', 'privacy'].includes(activeTab) && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-8">
              <div className="bg-white border border-black/5 rounded-3xl p-8">
                {pageContent ? (
                  <>
                    <h2 className="text-2xl font-bold text-zinc-900 mb-6">{pageContent.title}</h2>
                    <div className="text-zinc-600 leading-relaxed whitespace-pre-wrap">
                      {pageContent.content}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center py-12 text-zinc-500">
                    Loading content...
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </div>
      </main>

      {/* CUSTOMER CHECKOUT MODAL (Simulated) */}
      <AnimatePresence>
        {isCheckoutOpen && checkoutData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-md relative z-10 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="bg-zinc-50 px-6 py-5 border-b border-zinc-100 flex items-center justify-between sticky top-0">
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Secure Checkout</p>
                  <h3 className="text-lg font-bold text-zinc-900">{checkoutData.merchantName}</h3>
                </div>
                <button onClick={() => setIsCheckoutOpen(false)} className="w-8 h-8 bg-white border border-zinc-200 rounded-full flex items-center justify-center text-zinc-500 hover:bg-zinc-100 transition-colors">
                  <X size={16} />
                </button>
              </div>

              {/* Order Summary */}
              <div className="px-6 py-6 border-b border-zinc-100">
                <div className="flex justify-between items-end mb-2">
                  <p className="text-zinc-600 font-medium">{checkoutData.itemName}</p>
                  <p className="text-3xl font-black text-zinc-900">
                    {checkoutData.currency === 'USD' ? '$' : checkoutData.currency === 'EUR' ? '€' : checkoutData.currency === 'INR' ? '₹' : ''}
                    {checkoutData.amount}
                    {['USD','EUR','INR'].includes(checkoutData.currency) ? '' : ` ${checkoutData.currency}`}
                  </p>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="px-6 py-6 overflow-y-auto flex-1 bg-zinc-50/50">
                <p className="text-sm font-bold text-zinc-900 mb-4">Select Payment Method</p>
                
                <div className="space-y-4">
                  {checkoutData.methods.upi && (
                    <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                          <Smartphone size={16} className="text-emerald-600" />
                        </div>
                        <h4 className="font-bold text-zinc-900">Pay via UPI</h4>
                      </div>
                      
                      <div className="flex justify-center mb-4">
                        <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm">
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${checkoutData.methods.upi}&pn=${encodeURIComponent(checkoutData.merchantName)}&am=${checkoutData.amount}&cu=INR`)}`} 
                            alt="UPI QR Code" 
                            className="w-32 h-32"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between bg-zinc-50 rounded-xl p-3 border border-zinc-100 mb-3">
                        <code className="text-sm font-mono text-zinc-700">{checkoutData.methods.upi}</code>
                        <button 
                          onClick={() => copyToClipboard(checkoutData.methods.upi!, 'upi')}
                          className="text-emerald-600 hover:text-emerald-700 text-sm font-bold flex items-center gap-1"
                        >
                          {copiedField === 'upi' ? <Check size={14}/> : <Copy size={14}/>} Copy
                        </button>
                      </div>
                      <a 
                        href={`upi://pay?pa=${checkoutData.methods.upi}&pn=${checkoutData.merchantName}&am=${checkoutData.amount}&cu=INR`}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center transition-colors"
                      >
                        Open UPI App
                      </a>
                    </div>
                  )}

                  {checkoutData.methods.bank && (
                    <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <Building2 size={16} className="text-blue-600" />
                        </div>
                        <h4 className="font-bold text-zinc-900">Bank Transfer</h4>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between bg-zinc-50 rounded-xl p-3 border border-zinc-100">
                          <div>
                            <p className="text-[10px] font-bold text-zinc-500 uppercase">Account / IBAN</p>
                            <code className="text-sm font-mono text-zinc-700">{checkoutData.methods.bank.account}</code>
                          </div>
                          <button onClick={() => copyToClipboard(checkoutData.methods.bank!.account, 'bank')} className="text-emerald-600">
                            {copiedField === 'bank' ? <Check size={16}/> : <Copy size={16}/>}
                          </button>
                        </div>
                        <div className="flex items-center justify-between bg-zinc-50 rounded-xl p-3 border border-zinc-100">
                          <div>
                            <p className="text-[10px] font-bold text-zinc-500 uppercase">Routing / IFSC</p>
                            <code className="text-sm font-mono text-zinc-700">{checkoutData.methods.bank.ifsc}</code>
                          </div>
                          <button onClick={() => copyToClipboard(checkoutData.methods.bank!.ifsc, 'ifsc')} className="text-emerald-600">
                            {copiedField === 'ifsc' ? <Check size={16}/> : <Copy size={16}/>}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {checkoutData.methods.crypto && (
                    <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                          <Code size={16} className="text-teal-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-zinc-900">Crypto Transfer</h4>
                          <p className="text-xs text-zinc-500">{checkoutData.methods.crypto.network}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between bg-zinc-50 rounded-xl p-3 border border-zinc-100">
                        <code className="text-xs font-mono text-zinc-700 truncate mr-2">{checkoutData.methods.crypto.address}</code>
                        <button 
                          onClick={() => copyToClipboard(checkoutData.methods.crypto!.address, 'crypto')}
                          className="text-emerald-600 shrink-0"
                        >
                          {copiedField === 'crypto' ? <Check size={16}/> : <Copy size={16}/>}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-zinc-100 px-6 py-4 text-center border-t border-zinc-200">
                <p className="text-xs text-zinc-500 flex items-center justify-center gap-1">
                  <ShieldCheck size={14} /> Powered by PixelPay Decentralized Protocol
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}
