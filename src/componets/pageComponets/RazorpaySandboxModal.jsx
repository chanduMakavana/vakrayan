import { useState, useEffect } from 'react';

/**
 * RazorpaySandboxModal — Extracted simulation modal for test orders checkout.
 */
const RazorpaySandboxModal = ({
  isOpen,
  onClose,
  finalAmount,
  onSuccess,
  customerName = '',
  showToast
}) => {
  const [razorpayLang, setRazorpayLang] = useState('en');
  const [simulatedMethod, setSimulatedMethod] = useState('card');

  // Interactive states
  const [cardNo, setCardNo] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [saveCard, setSaveCard] = useState(true);

  const [upiId, setUpiId] = useState('');
  const [upiVerified, setUpiVerified] = useState('idle'); // idle | verifying | verified
  const [upiTimer, setUpiTimer] = useState(300);
  const [upiQrActive, setUpiQrActive] = useState(false);

  const [selectedBank, setSelectedBank] = useState('');
  const [customBankSelected, setCustomBankSelected] = useState('');
  const [nbSearchQuery, setNbSearchQuery] = useState('');
  const [nbDropdownOpen, setNbDropdownOpen] = useState(false);

  const [selectedWallet, setSelectedWallet] = useState('');
  const [walletPhone, setWalletPhone] = useState('');
  const [walletOtp, setWalletOtp] = useState('');
  const [walletLinked, setWalletLinked] = useState('idle'); // idle | sending | sent | linked

  const [paylaterOption, setPaylaterOption] = useState('');

  // QR countdown timer effect
  useEffect(() => {
    let interval = null;
    if (isOpen && simulatedMethod === 'upi' && upiQrActive) {
      interval = setInterval(() => {
        setUpiTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setTimeout(() => {
              showToast("UPI QR Code expired. Please generate a new one.", "error");
              setUpiQrActive(false);
              setUpiTimer(300);
            }, 0);
            return 300;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOpen, simulatedMethod, upiQrActive, showToast]);

  if (!isOpen) return null;

  // Translation helpers
  const translations = {
    en: {
      secured: "SECURED GATEWAY",
      title: "Razorpay Checkout (Sandbox)",
      cancel: "✕ CANCEL",
      merchant: "MERCHANT NAME",
      amount: "AMOUNT PAYABLE",
      payVia: "PAY VIA",
      cards: "Cards",
      upi: "UPI / QR",
      netbanking: "Netbanking",
      wallets: "Wallets",
      paylater: "EMI / Pay Later",
      cardTitle: "Credit or Debit Card",
      cardSubtitle: "Enter sandbox card credentials to verify",
      cardNo: "Card Number",
      cardExpiry: "Expiry Date",
      cardCvv: "CVV",
      cardHolder: "Cardholder Name",
      saveCard: "Remember this card securely",
      upiTitle: "Unified Payments Interface (UPI)",
      upiSubtitle: "Select preference for simulated payment channel",
      upiQr: "Instant GPay / PhonePe QR Code",
      upiQrSub: "Scan mock sandbox QR matrix",
      upiIdLabel: "Enter Virtual Payment Address (VPA)",
      verify: "Verify VPA",
      verifying: "Verifying...",
      verified: "Verified",
      invalidUpi: "Invalid UPI ID",
      invalidUpiSub: "Please use a valid UPI ID (e.g. username@bank)",
      nbTitle: "Popular Bank Selection",
      nbSubtitle: "Choose your bank sandbox connection",
      searchBank: "Search other Indian banks...",
      walletTitle: "Digital Wallet Partners",
      walletSubtitle: "Select active mock partner wallet channel",
      walletPhone: "Link Wallet Phone Number",
      sendOtp: "Link Wallet & Send OTP",
      linking: "Sending OTP...",
      otpSent: "OTP Sent successfully!",
      enterOtp: "Enter 4-Digit OTP",
      verifyOtp: "Verify & Link Wallet",
      linked: "Wallet Linked Successfully! ✅",
      paylaterTitle: "Pay Later & Cardless EMI",
      paylaterSubtitle: "Select simulated digital credit line",
      secStamp: "Razorpay Secured Sandbox Channel · PCI-DSS Compliant Gateway",
      paySecured: "Pay Secured"
    },
    hi: {
      secured: "सुरक्षित गेटवे",
      title: "रेज़रपे चेकआउट (सैंडबॉक्स)",
      cancel: "✕ रद्द करें",
      merchant: "विक्रेता का नाम",
      amount: "भुगतान राशि",
      payVia: "भुगतान का प्रकार",
      cards: "कार्ड",
      upi: "UPI / क्यूआर",
      netbanking: "नेटबैंकिंग",
      wallets: "वॉलेट",
      paylater: "पे लेटर / ईएमआई",
      cardTitle: "क्रेडिट या डेबिट कार्ड",
      cardSubtitle: "सत्यापित करने के लिए विवरण दर्ज करें",
      cardNo: "कार्ड नंबर",
      cardExpiry: "समाप्ति तिथि",
      cardCvv: "सीवीवी",
      cardHolder: "कार्डधारक का नाम",
      saveCard: "इस कार्ड को सुरक्षित रूप से याद रखें",
      upiTitle: "यूनिफाइड पेमेंट्स इंटरफेस (UPI)",
      upiSubtitle: "सिम्युलेटेड भुगतान चैनल चुनें",
      upiQr: "त्वरित GPay / PhonePe क्यूआर कोड",
      upiQrSub: "सैंडबॉक्स क्यूआर मैट्रिक्स स्कैन करें",
      upiIdLabel: "वर्चुअल पेमेंट एड्रेस (VPA) दर्ज करें",
      verify: "VPA सत्यापित करें",
      verifying: "सत्यापित हो रहा है...",
      verified: "सत्यापित",
      invalidUpi: "अमान्य UPI आईडी",
      invalidUpiSub: "कृपया सही UPI आईडी दर्ज करें (जैसे username@bank)",
      nbTitle: "लोकप्रिय बैंक चयन",
      nbSubtitle: "अपना बैंक सैंडबॉक्स कनेक्शन चुनें",
      searchBank: "अन्य भारतीय बैंक खोजें...",
      walletTitle: "डिजिटल वॉलेट भागीदार",
      walletSubtitle: "सक्रिय वॉलेट चैनल चुनें",
      walletPhone: "वॉलेट फ़ोन नंबर लिंक करें",
      sendOtp: "वॉलेट लिंक करें और OTP भेजें",
      linking: "ओटीपी भेज रहा है...",
      otpSent: "ओटीपी सफलतापूर्वक भेजा गया!",
      enterOtp: "4-अंकीय ओटीपी दर्ज करें",
      verifyOtp: "सत्यापित करें और लिंक करें",
      linked: "वॉलेट सफलतापूर्वक लिंक हो गया! ✅",
      paylaterTitle: "पे लेटर और कार्डलेस ईएमआई",
      paylaterSubtitle: "सिम्युलेटेड डिजिटल क्रेडिट लाइन चुनें",
      secStamp: "रेज़रपे सुरक्षित सैंडबॉक्स चैनल · PCI-DSS अनुपालन गेटवे",
      paySecured: "सुरक्षित भुगतान करें"
    }
  };

  const t = translations[razorpayLang] || translations.en;

  const allIndianBanksList = [
    "Bank of Baroda",
    "Bank of India",
    "Canara Bank",
    "Union Bank of India",
    "IDFC First Bank",
    "IndusInd Bank",
    "Federal Bank",
    "Central Bank of India",
    "Punjab National Bank",
    "Indian Overseas Bank",
    "UCO Bank",
    "Indian Bank",
    "Karnataka Bank",
    "RBL Bank",
    "South Indian Bank",
    "Bandhan Bank",
    "IDBI Bank",
    "Standard Chartered"
  ];

  // Card network logo generator
  const getCardNetwork = (num) => {
    const raw = num.replace(/\s+/g, '');
    if (raw.startsWith('4')) return { name: 'Visa', logo: '💳 Visa' };
    if (raw.startsWith('5')) return { name: 'Mastercard', logo: '💳 Mastercard' };
    if (raw.startsWith('6')) return { name: 'RuPay', logo: '💳 RuPay' };
    return { name: 'Card', logo: '💳 Card' };
  };
  const cardNetwork = getCardNetwork(cardNo);

  // Validation for payment action button
  const getIsPayButtonDisabled = () => {
    if (simulatedMethod === 'card') {
      return !cardNo || !cardExpiry || !cardCvv;
    }
    if (simulatedMethod === 'upi') {
      return !upiQrActive && upiVerified !== 'verified';
    }
    if (simulatedMethod === 'netbanking') {
      return !selectedBank && !customBankSelected;
    }
    if (simulatedMethod === 'wallet') {
      return walletLinked !== 'linked';
    }
    if (simulatedMethod === 'paylater') {
      return !paylaterOption;
    }
    return true;
  };
  const isPayButtonDisabled = getIsPayButtonDisabled();

  const getPayButtonText = () => {
    if (isPayButtonDisabled) {
      if (simulatedMethod === 'card') return "Fill card details to pay";
      if (simulatedMethod === 'upi') return "Generate QR or Verify UPI ID";
      if (simulatedMethod === 'netbanking') return "Select bank to pay";
      if (simulatedMethod === 'wallet') return "Select and Link Wallet";
      if (simulatedMethod === 'paylater') return "Select Pay Later option";
      return "Complete details";
    }
    return `${t.paySecured} ₹${finalAmount.toLocaleString('en-IN')}`;
  };

  const handlePaymentComplete = () => {
    const generatedPayId = `pay_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
    onSuccess(generatedPayId);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-[var(--color-surface)] w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-[var(--color-border)]/50 flex flex-col animate-scale-up">
        
        {/* Razorpay Brand Header */}
        <div className="bg-[#121c2c] px-6 py-4 text-white flex items-center justify-between border-b border-[#1b2a40]">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-indigo-500 flex items-center justify-center text-xs font-black text-white font-mono">R</div>
            <div className="flex flex-col">
              <span className="text-[8px] font-black tracking-[0.25em] text-[var(--color-muted)] uppercase leading-none">{t.secured}</span>
              <span className="text-xs font-black tracking-wider uppercase mt-1">{t.title}</span>
            </div>
          </div>
          
          {/* Language Selector & Cancel button */}
          <div className="flex items-center gap-4">
            <select
              value={razorpayLang}
              onChange={(e) => setRazorpayLang(e.target.value)}
              className="bg-[#1b2a40] text-white text-[10px] font-black tracking-wider uppercase px-2 py-1 rounded border border-[#2b3e59] outline-hidden cursor-pointer"
            >
              <option value="en">English ▾</option>
              <option value="hi">हिंदी ▾</option>
            </select>
            <button 
              type="button"
              onClick={onClose}
              className="text-[var(--color-muted)] hover:text-white text-[10px] font-bold font-mono tracking-widest cursor-pointer px-2 py-0.5 rounded transition-colors"
            >
              {t.cancel}
            </button>
          </div>
        </div>

        {/* Merchant Details Block */}
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface)]/50">
          <div>
            <span className="text-[8px] font-mono text-[var(--color-muted)] block uppercase font-black">{t.merchant}</span>
            <span className="text-xs font-black text-[var(--color-text)] uppercase tracking-wide">Vakrayan HQ</span>
          </div>
          <div className="text-right">
            <span className="text-[8px] font-mono text-[var(--color-muted)] block uppercase font-black">{t.amount}</span>
            <span className="text-base font-mono font-black text-[#121c2c]">₹{finalAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Main Interactive Split-pane */}
        <div className="flex flex-1 min-h-[350px] bg-[var(--color-surface)]">
          
          {/* Left Sidebar Tab Selection */}
          <div className="w-1/3 border-r border-[var(--color-border)] bg-[var(--color-surface)]/40 p-3 flex flex-col gap-1.5 shrink-0">
            <span className="text-[8px] font-mono text-[var(--color-muted)] block uppercase tracking-widest font-black mb-1 px-2">{t.payVia}</span>
            
            {/* 1. Card Tab */}
            <button
              type="button"
              onClick={() => setSimulatedMethod('card')}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-left transition-all cursor-pointer ${
                simulatedMethod === 'card' 
                ? 'bg-[var(--color-surface)] text-indigo-600 border border-[var(--color-border)] shadow-xs' 
                : 'text-[var(--color-muted)] hover:bg-neutral-100/50 hover:text-[var(--color-text)]'
              }`}
            >
              <span className="text-xs">💳</span>
              <span className="truncate">{t.cards}</span>
            </button>

            {/* 2. UPI Tab */}
            <button
              type="button"
              onClick={() => setSimulatedMethod('upi')}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-left transition-all cursor-pointer ${
                simulatedMethod === 'upi' 
                ? 'bg-[var(--color-surface)] text-indigo-600 border border-[var(--color-border)] shadow-xs' 
                : 'text-[var(--color-muted)] hover:bg-neutral-100/50 hover:text-[var(--color-text)]'
              }`}
            >
              <svg className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" viewBox="0 0 24 24">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              <span className="truncate">{t.upi}</span>
            </button>

            {/* 3. Netbanking Tab */}
            <button
              type="button"
              onClick={() => setSimulatedMethod('netbanking')}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-left transition-all cursor-pointer ${
                simulatedMethod === 'netbanking' 
                ? 'bg-[var(--color-surface)] text-indigo-600 border border-[var(--color-border)] shadow-xs' 
                : 'text-[var(--color-muted)] hover:bg-neutral-100/50 hover:text-[var(--color-text)]'
              }`}
            >
              <span className="text-xs">🏦</span>
              <span className="truncate">{t.netbanking}</span>
            </button>

            {/* 4. Wallet Tab */}
            <button
              type="button"
              onClick={() => setSimulatedMethod('wallet')}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-left transition-all cursor-pointer ${
                simulatedMethod === 'wallet' 
                ? 'bg-[var(--color-surface)] text-indigo-600 border border-[var(--color-border)] shadow-xs' 
                : 'text-[var(--color-muted)] hover:bg-neutral-100/50 hover:text-[var(--color-text)]'
              }`}
            >
              <span className="text-xs">📱</span>
              <span className="truncate">{t.wallets}</span>
            </button>

            {/* 5. EMI & PayLater Tab */}
            <button
              type="button"
              onClick={() => setSimulatedMethod('paylater')}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-left transition-all cursor-pointer ${
                simulatedMethod === 'paylater' 
                ? 'bg-[var(--color-surface)] text-indigo-600 border border-[var(--color-border)] shadow-xs' 
                : 'text-[var(--color-muted)] hover:bg-neutral-100/50 hover:text-[var(--color-text)]'
              }`}
            >
              <span className="text-xs">⏳</span>
              <span className="truncate">{t.paylater}</span>
            </button>
          </div>

          {/* Right Content Pane */}
          <div className="flex-1 p-6 flex flex-col justify-between">
            
            {/* Dynamic Content Views */}
            <div className="flex-1 space-y-4">
              
              {/* CARD FORM VIEW */}
              {simulatedMethod === 'card' && (
                <div className="space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black text-[var(--color-text)] uppercase tracking-widest block">{t.cardTitle}</span>
                      <span className="text-[9px] text-[var(--color-muted)] block mt-0.5">{t.cardSubtitle}</span>
                    </div>
                    
                    <button 
                      type="button"
                      onClick={() => {
                        setCardNo('4111 2222 3333 4444');
                        setCardExpiry('12 / 29');
                        setCardCvv('123');
                        setCardName((customerName || 'SANDBOX USER').toUpperCase());
                      }}
                      className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded transition-all cursor-pointer select-none"
                    >
                      ✨ Autofill Demo Card
                    </button>
                  </div>
                  
                  <div className="space-y-2.5">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[8px] font-bold text-[var(--color-muted)] uppercase tracking-widest">{t.cardNo}</label>
                        <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-mono">{cardNetwork.logo}</span>
                      </div>
                      <input 
                        type="text" 
                        placeholder="4111 2222 3333 4444" 
                        value={cardNo}
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, '').substring(0, 16);
                          let formatted = val.replace(/(\d{4})(?=\d)/g, '$1 ');
                          setCardNo(formatted);
                        }}
                        className="bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-indigo-600 rounded-lg px-3 py-2 text-xs font-mono font-bold text-[var(--color-text)] outline-hidden tracking-wider w-full transition-colors"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[8px] font-bold text-[var(--color-muted)] uppercase tracking-widest">{t.cardExpiry}</label>
                        <input 
                          type="text" 
                          placeholder="12 / 29" 
                          value={cardExpiry}
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, '').substring(0, 4);
                            if (val.length >= 2) {
                              val = val.substring(0, 2) + ' / ' + val.substring(2);
                            }
                            setCardExpiry(val);
                          }}
                          className="bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-indigo-600 rounded-lg px-3 py-2 text-xs font-mono font-bold text-[var(--color-text)] outline-hidden tracking-wider w-full transition-colors"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[8px] font-bold text-[var(--color-muted)] uppercase tracking-widest">{t.cardCvv}</label>
                        <input 
                          type="password" 
                          placeholder="•••" 
                          maxLength={3}
                          value={cardCvv}
                          onChange={(e) => {
                            setCardCvv(e.target.value.replace(/\D/g, '').substring(0, 3));
                          }}
                          className="bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-indigo-600 rounded-lg px-3 py-2 text-xs font-mono font-bold text-[var(--color-text)] outline-hidden tracking-wider w-full transition-colors"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-bold text-[var(--color-muted)] uppercase tracking-widest">{t.cardHolder}</label>
                      <input 
                        type="text" 
                        placeholder="SANDBOX USER" 
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value.toUpperCase())}
                        className="bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-indigo-600 rounded-lg px-3 py-2 text-xs font-sans font-bold text-[var(--color-text)] outline-hidden tracking-wider w-full transition-colors"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-[9px] font-bold text-[var(--color-muted)] cursor-pointer select-none mt-1">
                      <input 
                        type="checkbox" 
                        checked={saveCard}
                        onChange={(e) => setSaveCard(e.target.checked)}
                        className="accent-indigo-600"
                      />
                      <span>{t.saveCard}</span>
                    </label>
                  </div>
                </div>
              )}

              {/* UPI / QR VIEW */}
              {simulatedMethod === 'upi' && (
                <div className="space-y-3 animate-fade-in">
                  <div>
                    <span className="text-[10px] font-black text-[var(--color-text)] uppercase tracking-widest block">{t.upiTitle}</span>
                    <span className="text-[9px] text-[var(--color-muted)] block mt-0.5">{t.upiSubtitle}</span>
                  </div>
                  
                  {upiQrActive ? (
                    <div className="flex flex-col items-center justify-center p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl space-y-3 animate-scale-in">
                      <div className="bg-[var(--color-surface)] p-3 border border-[var(--color-border)] rounded-lg shadow-sm relative group">
                        <svg className="w-28 h-28 text-[#121c2c]" viewBox="0 0 100 100">
                          <path fill="currentColor" d="M0,0 h30 v30 h-30 z M10,10 h10 v10 h-10 z M70,0 h30 v30 h-30 z M80,10 h10 v10 h-10 z M0,70 h30 v30 h-30 z M10,80 h10 v10 h-10 z M40,10 h10 v10 h-10 z M55,5 h10 v10 h-10 z M45,40 h15 v15 h-15 z M5,45 h20 v10 h-20 z M80,45 h10 v20 h-10 z M40,75 h15 v15 h-15 z M75,75 h20 v20 h-20 z M85,65 h10 v10 h-10 z M65,35 h15 v10 h-15 z" />
                        </svg>
                        <div className="absolute inset-0 bg-[var(--color-surface)]/95 backdrop-blur-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => setUpiTimer(300)}>
                          <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">🔄 Reset QR</span>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <span className="text-[9px] font-black text-[var(--color-text)] uppercase tracking-wide block">Scan & Pay using GPay / PhonePe / BHIM</span>
                        <span className="text-[8px] font-mono text-rose-600 font-bold block mt-1">
                          ⏳ QR Code expires in {Math.floor(upiTimer / 60)}:{(upiTimer % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                      
                      <button 
                        type="button" 
                        onClick={() => setUpiQrActive(false)}
                        className="text-[8px] font-bold text-[var(--color-muted)] hover:text-[var(--color-text)] bg-neutral-200/50 px-2 py-0.5 rounded transition-colors cursor-pointer"
                      >
                        Cancel QR Scan
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div 
                        onClick={() => {
                          setUpiQrActive(true);
                          setUpiTimer(300);
                        }}
                        className="p-3 bg-[var(--color-surface)] hover:bg-indigo-50/20 hover:border-indigo-200 border border-[var(--color-border)] rounded-xl flex items-center justify-between cursor-pointer transition-all active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-[var(--color-surface)] border border-[var(--color-border)] rounded flex items-center justify-center text-xs shrink-0 select-none">📱</div>
                          <div>
                            <span className="text-[10px] font-black uppercase text-[var(--color-text)] block">{t.upiQr}</span>
                            <span className="text-[8px] font-mono text-[var(--color-muted)] block mt-0.5">{t.upiQrSub}</span>
                          </div>
                        </div>
                        <span className="text-[8px] font-black bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded uppercase">Generate QR</span>
                      </div>

                      <div className="relative flex items-center py-1">
                        <div className="w-full h-px bg-neutral-100" />
                        <span className="absolute left-1/2 -translate-x-1/2 bg-[var(--color-surface)] px-2.5 text-[8px] font-mono text-[var(--color-muted)] uppercase tracking-widest">OR PAY VIA UPI ID</span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[8px] font-bold text-[var(--color-muted)] uppercase tracking-widest">{t.upiIdLabel}</label>
                          {upiVerified === 'verified' && <span className="text-[8px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">✅ Verified: {customerName.toLowerCase() || 'customer'}@upi</span>}
                          {upiVerified === 'invalid' && <span className="text-[8px] font-mono font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">{t.invalidUpi}</span>}
                        </div>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="username@okhdfcbank" 
                            value={upiId}
                            onChange={(e) => {
                              setUpiId(e.target.value);
                              setUpiVerified('idle');
                            }}
                            className="bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-indigo-600 rounded-lg px-3 py-2 text-xs font-mono font-bold text-[var(--color-text)] outline-hidden tracking-wider flex-1 transition-colors"
                          />
                          <button
                            type="button"
                            disabled={!upiId || upiVerified === 'verified' || upiVerified === 'verifying'}
                            onClick={() => {
                              setUpiVerified('verifying');
                              setTimeout(() => {
                                const isValid = upiId.includes('@') && upiId.split('@')[0].length >= 2 && upiId.split('@')[1].length >= 2;
                                if (isValid) {
                                  setUpiVerified('verified');
                                } else {
                                  setUpiVerified('invalid');
                                }
                              }, 800);
                            }}
                            className={`px-3 py-2 text-[9px] font-black tracking-wider uppercase rounded-lg transition-all ${
                              upiVerified === 'verified' 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                              : upiVerified === 'invalid'
                              ? 'bg-rose-50 text-rose-600 border border-rose-200'
                              : upiVerified === 'verifying'
                              ? 'bg-neutral-100 text-[var(--color-muted)] border border-[var(--color-border)] animate-pulse'
                              : 'bg-neutral-950 hover:bg-neutral-800 text-white cursor-pointer active:scale-95'
                            }`}
                          >
                            {upiVerified === 'verifying' ? t.verifying : upiVerified === 'verified' ? t.verified : t.verify}
                          </button>
                        </div>

                        {upiVerified === 'invalid' && (
                          <p className="text-[8px] font-mono text-rose-500 uppercase leading-normal tracking-wide">
                            {t.invalidUpiSub}
                          </p>
                        )}

                        <div className="bg-indigo-50/40 border border-indigo-100 rounded-lg p-2 flex items-start gap-1.5">
                          <span className="text-xs">💡</span>
                          <p className="text-[8px] font-medium text-indigo-700 uppercase leading-normal tracking-wide">
                            Tip: For secure test mode, enter <strong className="font-mono text-indigo-900 select-all">success@razorpay</strong> or click quick handles to verify instantly!
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {['@okhdfcbank', '@okaxis', '@okicici', '@ybl', '@paytm'].map((handle) => (
                            <button
                              key={handle}
                              type="button"
                              onClick={() => {
                                let base = upiId.split('@')[0] || customerName.toLowerCase().replace(/\s+/g, '') || 'customer';
                                setUpiId(base + handle);
                                setUpiVerified('idle');
                              }}
                              className="text-[8px] font-mono font-bold text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-neutral-100 bg-[var(--color-surface)] border border-[var(--color-border)] px-2 py-0.5 rounded transition-all cursor-pointer"
                            >
                              {handle}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* NETBANKING VIEW */}
              {simulatedMethod === 'netbanking' && (
                <div className="space-y-3 animate-fade-in">
                  <div>
                    <span className="text-[10px] font-black text-[var(--color-text)] uppercase tracking-widest block">{t.nbTitle}</span>
                    <span className="text-[9px] text-[var(--color-muted)] block mt-0.5">{t.nbSubtitle}</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { name: 'HDFC Bank', logo: '🏦' },
                      { name: 'SBI Bank', logo: '🏦' },
                      { name: 'ICICI Bank', logo: '🏦' },
                      { name: 'Axis Bank', logo: '🏦' },
                      { name: 'Kotak Bank', logo: '🏦' },
                      { name: 'Yes Bank', logo: '🏦' }
                    ].map((bank) => {
                      const isSelected = selectedBank === bank.name && !customBankSelected;
                      return (
                        <div 
                          key={bank.name}
                          onClick={() => {
                            setSelectedBank(bank.name);
                            setCustomBankSelected('');
                          }}
                          className={`p-2.5 border rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all active:scale-95 ${
                            isSelected 
                            ? 'border-indigo-600 bg-indigo-50/50 shadow-xs scale-[1.02]' 
                            : 'border-[var(--color-border)] bg-[var(--color-subtle)] hover:border-[var(--color-accent-hover)]'
                          }`}
                        >
                          <span className="text-base">{bank.logo}</span>
                          <span className="text-[8px] font-black uppercase tracking-wider text-[var(--color-text)] mt-1 truncate w-full">{bank.name}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="relative">
                    <div 
                      onClick={() => setNbDropdownOpen(!nbDropdownOpen)}
                      className="w-full p-3 bg-[var(--color-surface)] hover:bg-neutral-100/50 border border-[var(--color-border)] rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <span className="text-[9px] font-black uppercase tracking-wider text-[var(--color-muted)]">
                        {customBankSelected ? `🏦 Selected: ${customBankSelected}` : t.searchBank}
                      </span>
                      <span className="text-xs text-[var(--color-muted)]">{nbDropdownOpen ? '▴' : '▾'}</span>
                    </div>

                    {nbDropdownOpen && (
                      <div className="absolute top-full left-0 w-full mt-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl z-50 p-2 space-y-2 max-h-48 overflow-y-auto">
                        <input 
                          type="text" 
                          placeholder="Search bank name..."
                          value={nbSearchQuery}
                          onChange={(e) => setNbSearchQuery(e.target.value)}
                          className="w-full bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-indigo-600 rounded-lg px-3 py-2 text-[9px] font-sans font-bold text-[var(--color-text)] outline-hidden placeholder-[var(--color-muted)]"
                        />
                        <div className="space-y-1">
                          {allIndianBanksList
                            .filter(bName => bName.toLowerCase().includes(nbSearchQuery.toLowerCase()))
                            .map((bName) => (
                              <div
                                key={bName}
                                onClick={() => {
                                  setCustomBankSelected(bName);
                                  setSelectedBank('');
                                  setNbDropdownOpen(false);
                                  setNbSearchQuery('');
                                }}
                                className="px-3 py-2 hover:bg-[var(--color-surface)] rounded-lg text-[9px] font-black uppercase tracking-wider text-[var(--color-text)] cursor-pointer transition-colors"
                              >
                                🏦 {bName}
                              </div>
                            ))}
                          {allIndianBanksList.filter(bName => bName.toLowerCase().includes(nbSearchQuery.toLowerCase())).length === 0 && (
                            <div className="px-3 py-2 text-[9px] font-mono text-[var(--color-muted)] text-center">
                              No matching Indian banks found
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* WALLET VIEW */}
              {simulatedMethod === 'wallet' && (
                <div className="space-y-3 animate-fade-in">
                  <div>
                    <span className="text-[10px] font-black text-[var(--color-text)] uppercase tracking-widest block">{t.walletTitle}</span>
                    <span className="text-[9px] text-[var(--color-muted)] block mt-0.5">{t.walletSubtitle}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {['Paytm Wallet', 'PhonePe Wallet', 'Amazon Pay', 'JioMoney'].map((wName) => {
                      const isSelected = selectedWallet === wName;
                      return (
                        <div 
                          key={wName} 
                          onClick={() => {
                            setSelectedWallet(wName);
                            setWalletLinked('idle');
                            setWalletOtp('');
                          }}
                          className={`flex items-center gap-2 p-3 border rounded-xl text-[9px] font-black uppercase tracking-wider text-[var(--color-text)] cursor-pointer select-none transition-all active:scale-[0.98] ${
                            isSelected 
                            ? 'border-indigo-600 bg-indigo-50/50 shadow-xs' 
                            : 'border-[var(--color-border)] bg-[var(--color-subtle)] hover:border-[var(--color-accent-hover)]'
                          }`}
                        >
                          <span>📱</span>
                          <span>{wName}</span>
                        </div>
                      );
                    })}
                  </div>

                  {selectedWallet && (
                    <div className="p-3 bg-[var(--color-surface)]/50 border border-[var(--color-border)] rounded-xl space-y-3 animate-slide-down">
                      {walletLinked === 'idle' && (
                        <div className="space-y-2">
                          <label className="text-[8px] font-bold text-[var(--color-muted)] uppercase tracking-widest">{t.walletPhone}</label>
                          <input 
                            type="text" 
                            value={walletPhone}
                            onChange={(e) => setWalletPhone(e.target.value)}
                            placeholder="Enter mobile number linked to wallet"
                            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs font-mono font-bold text-[var(--color-text)] outline-hidden tracking-wider w-full focus:border-indigo-600 transition-colors"
                          />
                          <button
                            type="button"
                            disabled={!walletPhone}
                            onClick={() => {
                              setWalletLinked('sending');
                              setTimeout(() => {
                                setWalletLinked('sent');
                              }, 1000);
                            }}
                            className="w-full bg-neutral-950 hover:bg-neutral-800 text-white font-black text-[9px] tracking-widest uppercase py-2.5 rounded-lg transition-all active:scale-95 cursor-pointer"
                          >
                            {t.sendOtp}
                          </button>
                        </div>
                      )}

                      {walletLinked === 'sending' && (
                        <div className="text-center py-2 animate-pulse">
                          <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest">{t.linking}</span>
                        </div>
                      )}

                      {walletLinked === 'sent' && (
                        <div className="space-y-2.5">
                          <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block font-mono">
                            📩 {t.otpSent} (Type '1234' to link)
                          </span>
                          <input 
                            type="text" 
                            value={walletOtp}
                            onChange={(e) => setWalletOtp(e.target.value.replace(/\D/g, '').substring(0, 4))}
                            placeholder="ENTER 4-DIGIT OTP"
                            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs font-mono font-bold text-[var(--color-text)] text-center outline-hidden tracking-[0.3em] w-full focus:border-indigo-600 transition-colors"
                          />
                          <button
                            type="button"
                            disabled={walletOtp.length !== 4}
                            onClick={() => {
                              setWalletLinked('linked');
                            }}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[9px] tracking-widest uppercase py-2.5 rounded-lg transition-all active:scale-95 cursor-pointer"
                          >
                            {t.verifyOtp}
                          </button>
                        </div>
                      )}

                      {walletLinked === 'linked' && (
                        <div className="text-center py-2 bg-emerald-50 border border-emerald-200 rounded-lg animate-scale-in">
                          <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">
                            {t.linked}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* PAY LATER & EMI VIEW */}
              {simulatedMethod === 'paylater' && (
                <div className="space-y-3 animate-fade-in">
                  <div>
                    <span className="text-[10px] font-black text-[var(--color-text)] uppercase tracking-widest block">{t.paylaterTitle}</span>
                    <span className="text-[9px] text-[var(--color-muted)] block mt-0.5">{t.paylaterSubtitle}</span>
                  </div>
                  
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1 scrollbar-none">
                    {[
                      { name: 'Simpl', desc: 'Get ₹15,000 credit limit instantly. 1-click checkout, pay in 15 days.' },
                      { name: 'LazyPay', desc: 'Secure credit line. Pay in 15 days at 0% interest.' },
                      { name: 'ICICI Bank PayLater', desc: 'Pre-approved credit line for ICICI account holders.' },
                      { name: 'HDFC FlexiPay', desc: 'Instant flexible digital credit line.' }
                    ].map((opt) => {
                      const isSelected = paylaterOption === opt.name;
                      return (
                        <div 
                          key={opt.name}
                          onClick={() => setPaylaterOption(opt.name)}
                          className={`p-2.5 border rounded-xl flex items-start gap-2.5 cursor-pointer transition-all active:scale-[0.99] ${
                            isSelected 
                            ? 'border-indigo-600 bg-indigo-50/50 shadow-xs' 
                            : 'border-[var(--color-border)] bg-[var(--color-subtle)] hover:border-[var(--color-accent-hover)]'
                          }`}
                        >
                          <div className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                            isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-neutral-300 bg-[var(--color-surface)]'
                          }`}>
                            {isSelected && <div className="w-1 h-1 bg-[var(--color-surface)] rounded-full" />}
                          </div>
                          <div className="min-w-0">
                            <span className="text-[9px] font-black uppercase text-[var(--color-text)] block">{opt.name}</span>
                            <span className="text-[8px] font-mono text-[var(--color-muted)] block leading-normal mt-0.5 truncate">{opt.desc}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

            {/* Primary Sandbox Payment Action Trigger Button */}
            <button
              type="button"
              disabled={isPayButtonDisabled}
              onClick={handlePaymentComplete}
              className={`w-full text-white font-black text-[10px] tracking-widest uppercase py-3.5 rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer mt-4 ${
                isPayButtonDisabled 
                ? 'bg-neutral-200 text-[var(--color-muted)] border border-neutral-300 cursor-not-allowed shadow-none' 
                : 'bg-[#121c2c] hover:bg-[#1b2a40]'
              }`}
            >
              {getPayButtonText()} &rarr;
            </button>

          </div>
        </div>

        {/* Secured Stamp */}
        <div className="bg-[var(--color-surface)] px-6 py-3 border-t border-[var(--color-border)] flex items-center justify-between text-[8px] font-mono text-[var(--color-muted)] tracking-wider">
          <span>{t.secStamp}</span>
          <span>SSL 256-BIT</span>
        </div>

      </div>
    </div>
  );
};

export default RazorpaySandboxModal;
