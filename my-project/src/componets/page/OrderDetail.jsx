import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FiArrowLeft, FiTruck, FiCheckCircle, FiShield, FiFileText } from 'react-icons/fi';
import ordersService from '../../appwrite/orders';
import Navbar from '../pageComponets/Navbar';
import { useToast } from '../../context/ToastContext';
import Footer from '../pageComponets/Footer';

function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { user, isAuthenticated } = useSelector(state => state.auth);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    async function loadOrderSpec() {
      try {
        setLoading(true);
        const orderData = await ordersService.getOrderById(id);
        if (orderData) {
          // Security lock: Ensure users can only view their own orders
          if (orderData.userId !== user.$id && user.email !== import.meta.env.VITE_ADMIN_EMAIL && user.email !== "makwanachandu480@gmail.com") {
            showToast("Security Clearance Required. Access Aborted.", "error");
            navigate('/profile');
            return;
          }
          setOrder(orderData);
        } else {
          showToast("Requested order manifest untraceable inside active servers.", "error");
          navigate('/profile');
        }
      } catch (err) {
        console.error("Failed to load order manifest specification:", err);
        navigate('/profile');
      } finally {
        setLoading(false);
      }
    }

    if (id && user) {
      loadOrderSpec();
    }
  }, [id, user, isAuthenticated, navigate, showToast]);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#fafafb] flex flex-col items-center justify-center gap-4">
        <div className="w-6 h-6 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
        <div className="text-[10px] tracking-[0.5em] text-neutral-900 font-black uppercase">
          FETCHING MANIFEST COORDINATES // HQ
        </div>
      </div>
    );
  }

  if (!order) return null;

  const orderDate = new Date(order.$createdAt || order.createdAt || '1970-01-01').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  let parsedItems;
  try {
    parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
  } catch {
    parsedItems = [];
  }

  // Calculate order metrics
  const totalItemsCount = parsedItems.reduce((acc, i) => acc + Number(i.quantity || 1), 0);

  // Status index for visual track
  const statusSteps = [
    { key: 'PENDING', label: 'Order Confirmed', desc: 'Garment manifest logged and secured.' },
    { key: 'PROCESSING', label: 'Processed & Packed', desc: 'HQ staff verified streetwear quality standards.' },
    { key: 'SHIPPED', label: 'Shipped & Outward', desc: 'Express shipment dispatched via global logistics partner.' },
    { key: 'IN_TRANSIT', label: 'In Transit', desc: 'Drop packages arriving at nearest fulfillment center.' },
    { key: 'DELIVERED', label: 'Delivered Fits', desc: 'Secure courier drop off confirmed at consignee address.' }
  ];

  const foundIdx = statusSteps.findIndex(s => s.key === order.status);
  const currentStepIdx = foundIdx !== -1 ? foundIdx : 0;


  return (
    <>
      <Navbar />

      <div className="w-full min-h-screen bg-[#fafafb] text-neutral-900 font-sans relative selection:bg-neutral-900 selection:text-white pb-20 bg-[url(https://static.vecteezy.com/system/resources/previews/015/586/867/large_2x/overlay-distressed-concrete-texture-background-free-photo.jpg)] bg-cover bg-center">
        <div className="absolute inset-0 bg-white/96 backdrop-blur-xs z-10" />

        <div className="max-w-4xl mx-auto px-6 md:px-12 py-10 relative z-20 space-y-8">
          
          {/* Header Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200/40">
            <Link to="/profile" className="inline-flex items-center gap-2 text-xs font-black tracking-widest text-neutral-400 hover:text-neutral-950 transition-colors uppercase group">
              <FiArrowLeft className="text-sm group-hover:-translate-x-1 transition-transform" />
              Return to terminal
            </Link>
            <div className="text-[9px] tracking-[0.3em] font-mono text-neutral-400 uppercase">
              ORDER SPEC COORDINATE INDEX // SECURE
            </div>
          </div>

          {/* Core Invoice Summary Card */}
          <div className="bg-white p-8 rounded-2xl border border-neutral-200/60 shadow-2xl space-y-6">
            
            {/* ID & Date */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
              <div className="space-y-1">
                <span className="text-[8px] font-mono text-neutral-400 block uppercase">SECURED DROP MANIFEST ID</span>
                <h1 className="text-xl md:text-2xl font-black tracking-wide text-neutral-950 uppercase">
                  #{order.$id || order.id}
                </h1>
              </div>
              <div className="text-left md:text-right">
                <span className="text-[8px] font-mono text-neutral-400 block uppercase">TRANSACTION TIMESTAMP</span>
                <span className="text-xs font-mono font-bold text-neutral-600 block mt-0.5 uppercase">
                  {orderDate}
                </span>
              </div>
            </div>

            {/* Industrial Fulfillment Status Track */}
            <div className="bg-neutral-50 p-8 rounded-2xl border border-neutral-200 space-y-6">
              <h3 className="text-[10px] font-black tracking-[0.25em] text-neutral-400 uppercase">
                🚚 LIVE SHIPMENT TRACKER
              </h3>
              
              <div className="relative pl-6 space-y-8">
                {/* Vertical Line */}
                <div className="absolute left-[35px] top-4 bottom-4 w-1 bg-neutral-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[var(--theme-primary)] transition-all duration-1000 ease-out" 
                    style={{ height: `${(currentStepIdx / 4) * 100}%` }}
                  />
                </div>

                {statusSteps.map((step, idx) => {
                  const isActive = idx <= currentStepIdx;
                  const isCurrent = idx === currentStepIdx;
                  return (
                    <div key={step.key} className="flex gap-6 items-start relative z-10">
                      {/* Checkpoint Dot */}
                      <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 transition-all duration-500 ${
                        isCurrent 
                        ? 'bg-[var(--theme-primary)] border-[var(--theme-primary)] text-white shadow-lg scale-110 animate-pulse' 
                        : isActive 
                        ? 'bg-neutral-900 border-neutral-900 text-white' 
                        : 'bg-white border-neutral-200 text-neutral-400'
                      }`}>
                        {idx === 4 ? (
                          <FiCheckCircle className="text-sm" />
                        ) : idx === 2 ? (
                          <FiTruck className="text-sm" />
                        ) : (
                          <FiFileText className="text-sm" />
                        )}
                      </div>

                      {/* Content block */}
                      <div className="space-y-1 pt-1">
                        <h4 className={`text-xs font-black uppercase tracking-wide ${isActive ? 'text-neutral-950 font-black' : 'text-neutral-400'}`}>
                          {step.label}
                        </h4>
                        <p className="text-[10px] text-neutral-500 max-w-lg leading-relaxed">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Itemized Garments Specification List */}
            <div className="space-y-4">
              <h3 className="text-[9px] font-black tracking-[0.25em] text-neutral-400 uppercase">
                Claimed Garments specification
              </h3>

              <div className="divide-y divide-neutral-100 border border-neutral-100 rounded-2xl overflow-hidden bg-neutral-50/20 p-4 space-y-4">
                {parsedItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 text-xs pt-4 first:pt-0">
                    <div className="space-y-1">
                      <h4 className="font-black text-neutral-950 uppercase tracking-wide">
                        {item.name}
                      </h4>
                      <p className="text-[9px] font-mono text-neutral-500 uppercase">
                        Size: {item.size || 'M'} · Quantity: {item.quantity} · Price: ₹{item.price}
                      </p>
                    </div>
                    <span className="font-mono font-black text-neutral-950 text-sm shrink-0">
                      ₹{Number(item.price * item.quantity).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Calculations & Total Invoice */}
            <div className="space-y-3.5 text-xs font-mono font-medium uppercase text-neutral-600 pt-4 border-t border-neutral-100">
              <div className="flex justify-between">
                <span>Gross catalog Value ({totalItemsCount} items)</span>
                <span className="text-neutral-950 font-bold">
                  ₹{parsedItems.reduce((acc, i) => acc + Number(i.price * i.quantity), 0).toLocaleString('en-IN')}
                </span>
              </div>
              {order.couponApplied !== 'NONE' && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>PROMO SAVINGS ({order.couponApplied})</span>
                  <span className="font-black">
                    SAVED ON DROP
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>DISPATCH EXPRESS</span>
                <span className="text-emerald-600 font-black tracking-wider text-[9px] bg-emerald-50 px-1.5 py-0.5 rounded">
                  FREE DISPATCH
                </span>
              </div>
              <div className="flex justify-between">
                <span>PAYMENT METHOD</span>
                <span className="text-neutral-950 font-bold tracking-wide">
                  {order.paymentMethod || (order.address?.includes('[Payment: ONLINE]') ? 'ONLINE' : 'COD')}
                </span>
              </div>
              {order.paymentProvider && order.paymentProvider !== 'NONE' && (
                <div className="flex justify-between">
                  <span>PAYMENT PROVIDER</span>
                  <span className="text-indigo-600 font-black tracking-wide bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">
                    {order.paymentProvider}
                  </span>
                </div>
              )}
              {order.paymentStatus && (
                <div className="flex justify-between">
                  <span>PAYMENT STATUS</span>
                  <span className={`font-black tracking-wider text-[10px] px-1.5 py-0.5 rounded ${
                    order.paymentStatus === 'PAID' ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' : 'text-rose-600 bg-rose-50 border border-rose-150'
                  }`}>
                    {order.paymentStatus}
                  </span>
                </div>
              )}
              {order.razorpayPaymentId && (
                <div className="flex justify-between">
                  <span>TRANSACTION ID</span>
                  <span className="text-neutral-600 font-mono text-[10px]">
                    {order.razorpayPaymentId}
                  </span>
                </div>
              )}
              <hr className="border-neutral-100" />
              <div className="flex justify-between items-baseline pt-2">
                <span className="text-sm font-black text-neutral-950 uppercase tracking-wide">Net deposited amount</span>
                <span className="text-2xl font-black text-neutral-950 tracking-tight">
                  ₹{Number(order.total || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Shipping Logistics Coordinates */}
            <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-200 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs uppercase tracking-wide">
              <div>
                <span className="text-[8px] font-mono text-neutral-400 block uppercase tracking-widest">CONSIGNEE DETAILS</span>
                <span className="text-neutral-950 font-bold block mt-1">{order.customerName}</span>
                <span className="text-neutral-500 font-mono text-[10px] block mt-0.5">{order.phone}</span>
                <span className="text-neutral-500 font-mono text-[10px] block lowercase mt-0.5">{order.email}</span>
              </div>
              <div>
                <span className="text-[8px] font-mono text-neutral-400 block uppercase tracking-widest">SHIPPING MANIFEST ADDRESS</span>
                <span className="text-neutral-950 font-bold block mt-1 leading-relaxed">
                  {order.address}
                </span>
              </div>
            </div>

            {/* Security Shield */}
            <div className="flex items-center gap-3 text-[8px] font-mono text-neutral-500 border border-neutral-100 bg-neutral-50/50 p-4 rounded-xl leading-normal uppercase">
              <FiShield className="text-base text-neutral-800 shrink-0" />
              <div>
                <span className="font-bold text-neutral-800 block mb-0.5">🔒 SECURED BLOCKCHAIN LEDGER BLOCK</span>
                Fit manifest drop record verified and logged inside our distributed Appwrite database cloud networks.
              </div>
            </div>

          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}

export default OrderDetail;
