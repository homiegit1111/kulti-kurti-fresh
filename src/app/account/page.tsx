"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Package, User, LogOut, Loader2, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useUser, useClerk } from "@clerk/nextjs";
import Image from "next/image";
import type { ShopifyAdminOrder } from "@/lib/server/shopify-admin";
import { formatPrice } from "@/lib/medusa";

type AccountTab = "orders" | "profile";

export default function AccountPage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<AccountTab>("orders");
  const [orders, setOrders] = useState<ShopifyAdminOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  
  // Profile update state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");

  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/login?redirect=/account");
    }
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
    }
  }, [user, isLoaded, router]);

  useEffect(() => {
    if (isLoaded && user) {
      setOrdersLoading(true);
      fetch("/api/account/orders")
        .then((res) => res.json())
        .then((data: { orders?: ShopifyAdminOrder[] }) => {
          if (Array.isArray(data.orders)) {
            setOrders(data.orders);
          }
        })
        .catch(() => {})
        .finally(() => {
          setOrdersLoading(false);
        });
    }
  }, [isLoaded, user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsUpdating(true);
    try {
      await user.update({ firstName, lastName });
      setUpdateMessage("Profile updated successfully.");
      setTimeout(() => setUpdateMessage(""), 3000);
    } catch (err: any) {
      setUpdateMessage(err.errors?.[0]?.longMessage || "An error occurred.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isLoaded || !user) {
    return (
      <>
        <Navbar />
        <main className="flex-1 min-h-[80vh] flex items-center justify-center bg-warm-white pt-32 pb-24">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </main>
        <Footer />
      </>
    );
  }

  const primaryEmail = user.primaryEmailAddress?.emailAddress;

  return (
    <>
      <Navbar />
      <main className="flex-1 bg-warm-white pt-32 pb-24 min-h-screen">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
            
            {/* Left Sidebar Profile Card */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-charcoal/5 shadow-[0_20px_40px_rgba(0,0,0,0.03)] rounded-2xl overflow-hidden mb-8 relative">
                <div className="h-32 bg-charcoal relative">
                  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1613040809024-b4ef7ba99bc3?q=80&w=600&auto=format&fit=crop')] opacity-20 object-cover mix-blend-overlay" />
                </div>
                <div className="px-6 pb-8 text-center relative">
                  <div className="w-24 h-24 rounded-full border-4 border-white shadow-xl overflow-hidden mx-auto -mt-12 bg-warm-white relative z-10">
                    <Image src={user.imageUrl} alt="Profile Avatar" fill className="object-cover" />
                  </div>
                  <h2 className="font-serif text-2xl text-charcoal mt-4 mb-1">
                    {user.firstName || user.lastName ? `${user.firstName || ""} ${user.lastName || ""}` : "VIP Guest"}
                  </h2>
                  <p className="text-xs text-charcoal/60 font-sans tracking-wide">{primaryEmail}</p>
                  
                  <div className="mt-6 flex flex-col gap-2">
                    <button
                      onClick={() => setActiveTab("orders")}
                      className={`w-full flex items-center gap-3 text-xs uppercase tracking-widest font-bold px-4 py-4 rounded-xl transition-all ${
                        activeTab === "orders" ? "bg-charcoal text-gold shadow-lg" : "text-charcoal/60 hover:bg-charcoal/5"
                      }`}
                    >
                      <Package className="w-4 h-4" /> Order History
                    </button>
                    <button
                      onClick={() => setActiveTab("profile")}
                      className={`w-full flex items-center gap-3 text-xs uppercase tracking-widest font-bold px-4 py-4 rounded-xl transition-all ${
                        activeTab === "profile" ? "bg-charcoal text-gold shadow-lg" : "text-charcoal/60 hover:bg-charcoal/5"
                      }`}
                    >
                      <User className="w-4 h-4" /> Profile Settings
                    </button>
                    <div className="h-px w-full bg-charcoal/10 my-2" />
                    <button
                      onClick={() => signOut({ redirectUrl: "/" })}
                      className="w-full flex items-center gap-3 text-xs uppercase tracking-widest font-bold px-4 py-4 rounded-xl text-red-600/80 hover:bg-red-50 transition-all"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-3">
              {activeTab === "orders" && (
                <div className="animate-fade-in">
                  <h1 className="font-serif text-4xl text-charcoal mb-8 border-b border-charcoal/10 pb-6">
                    Order <span className="italic text-gold">History</span>
                  </h1>

                  {ordersLoading ? (
                    <div className="flex justify-center py-24">
                      <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="bg-white border border-charcoal/5 p-12 text-center rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.02)]">
                      <Package className="w-16 h-16 text-charcoal/10 mx-auto mb-6" />
                      <h3 className="font-serif text-2xl text-charcoal mb-3">No orders yet</h3>
                      <p className="text-charcoal/60 text-sm max-w-sm mx-auto mb-8 leading-relaxed">
                        Your bespoke journey awaits. Once you make a purchase, your orders will appear here for seamless tracking.
                      </p>
                      <button onClick={() => router.push("/shop")} className="inline-flex items-center gap-2 bg-charcoal text-white text-[10px] font-bold uppercase tracking-widest px-8 py-4 rounded-full hover:bg-black transition-all">
                        Discover Collections <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {orders.map((order) => {
                        const total = Number(order.total_price);
                        const date = new Date(order.created_at);
                        return (
                          <div
                            key={order.id}
                            className="bg-white border border-charcoal/10 rounded-2xl p-6 lg:p-8 hover:border-gold/30 transition-all shadow-sm"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-6 mb-6 pb-6 border-b border-charcoal/5">
                              <div>
                                <div className="flex items-center gap-3 mb-2">
                                  <p className="font-serif text-xl text-charcoal">
                                    Order {order.name}
                                  </p>
                                  <span className="inline-flex px-3 py-1 bg-warm-white text-[9px] uppercase tracking-widest text-charcoal font-bold rounded-full">
                                    {order.financial_status}
                                  </span>
                                </div>
                                <p className="text-sm text-charcoal/60 font-sans">
                                  Placed on {date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-sans text-xl font-medium text-charcoal mb-2">
                                  {formatPrice(total * 100)}
                                </p>
                                {order.fulfillment_status && (
                                  <span className="inline-block px-3 py-1 bg-charcoal text-[9px] uppercase tracking-widest text-white font-bold rounded-full">
                                    {order.fulfillment_status}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="space-y-4">
                              {order.line_items.map((item) => (
                                <div key={item.id} className="flex justify-between items-center bg-warm-white/50 p-4 rounded-xl">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-charcoal/5 rounded-lg flex items-center justify-center text-xs font-bold text-charcoal">
                                      x{item.quantity}
                                    </div>
                                    <div>
                                      <p className="font-medium text-charcoal text-sm">{item.title}</p>
                                      {item.variant_title && (
                                        <p className="text-xs text-charcoal/50 mt-1">{item.variant_title}</p>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-charcoal font-semibold text-sm">
                                    {formatPrice(Number(item.price) * 100)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "profile" && (
                <div className="animate-fade-in bg-white border border-charcoal/5 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.02)] p-8 lg:p-12">
                  <h1 className="font-serif text-3xl text-charcoal mb-8 border-b border-charcoal/10 pb-6">
                    Profile <span className="italic text-gold">Settings</span>
                  </h1>

                  <form onSubmit={handleUpdateProfile} className="max-w-md space-y-8">
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-charcoal/40 font-bold mb-2">Primary Email</label>
                      <input 
                        type="email" 
                        value={primaryEmail || ""} 
                        disabled 
                        className="w-full border-b border-charcoal/10 bg-warm-white/30 px-4 py-3 text-charcoal/50 font-sans text-sm rounded-t-lg cursor-not-allowed"
                      />
                      <p className="text-[10px] text-charcoal/40 mt-2 font-medium">Email address cannot be changed directly.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] uppercase tracking-[0.2em] text-charcoal/40 font-bold mb-2">First Name</label>
                        <input 
                          type="text" 
                          value={firstName} 
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full border-b border-charcoal/20 bg-transparent px-0 py-3 text-charcoal font-sans text-sm focus:border-gold focus:ring-0 transition-colors"
                          placeholder="Your first name"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-[0.2em] text-charcoal/40 font-bold mb-2">Last Name</label>
                        <input 
                          type="text" 
                          value={lastName} 
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full border-b border-charcoal/20 bg-transparent px-0 py-3 text-charcoal font-sans text-sm focus:border-gold focus:ring-0 transition-colors"
                          placeholder="Your last name"
                        />
                      </div>
                    </div>

                    {updateMessage && (
                      <div className={`p-4 rounded-xl text-xs font-medium ${updateMessage.includes("success") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                        {updateMessage}
                      </div>
                    )}

                    <button 
                      type="submit" 
                      disabled={isUpdating}
                      className="bg-charcoal text-white text-[10px] font-bold uppercase tracking-[0.2em] h-14 px-8 rounded-full hover:bg-black transition-all flex items-center justify-center min-w-[200px]"
                    >
                      {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                    </button>
                  </form>
                </div>
              )}

            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
