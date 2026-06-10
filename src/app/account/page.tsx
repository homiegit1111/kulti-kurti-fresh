"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Package, User, LogOut, Loader2, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useUser, useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { isAuthEnabled } from "@/lib/auth/config";
import Image from "next/image";
import type { ShopifyAdminOrder } from "@/lib/server/shopify-admin";
import { formatPrice } from "@/lib/shopify";

type AccountTab = "orders" | "profile";

function AccountInner() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<AccountTab>("orders");
  const [orders, setOrders] = useState<ShopifyAdminOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersNotice, setOrdersNotice] = useState<string>("");
  
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
      // Seed the editable profile form from the Clerk user once it resolves.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
    }
  }, [user, isLoaded, router]);

  useEffect(() => {
    if (isLoaded && user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOrdersLoading(true);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOrdersNotice("");
      fetch("/api/account/orders")
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json() as Promise<{
            orders?: ShopifyAdminOrder[];
            synced?: boolean;
            error?: string;
            message?: string;
          }>;
        })
        .then((data) => {
          if (Array.isArray(data.orders)) setOrders(data.orders);
          // Distinguish "store not connected yet" / fetch failure from a real
          // empty history so the customer isn't misled by "No orders yet".
          if (data.synced === false) {
            setOrdersNotice(
              "Order syncing isn't fully set up yet — your purchase history will appear here soon.",
            );
          } else if (data.error) {
            setOrdersNotice(
              "We couldn't load your orders right now. Please refresh in a moment.",
            );
          }
        })
        .catch(() => {
          setOrdersNotice(
            "We couldn't load your orders right now. Please refresh in a moment.",
          );
        })
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
    } catch (err) {
      const message =
        err && typeof err === "object" && "errors" in err
          ? (err as { errors?: { longMessage?: string }[] }).errors?.[0]
              ?.longMessage
          : undefined;
      setUpdateMessage(message || "An error occurred.");
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
              <div className="panel-luxe overflow-hidden mb-8 relative">
                <div className="bg-charcoal px-6 py-10 text-center relative frame-luxe">
                  <div className="w-20 h-20 rounded-full border border-gold/50 p-1 overflow-hidden mx-auto relative z-10">
                    <div className="relative w-full h-full rounded-full overflow-hidden">
                      <Image src={user.imageUrl} alt="Profile Avatar" fill className="object-cover" />
                    </div>
                  </div>
                  <h2 className="font-serif text-2xl font-light text-warm-white mt-5 mb-1">
                    {user.firstName || user.lastName ? `${user.firstName || ""} ${user.lastName || ""}` : "Guest of the House"}
                  </h2>
                  <p className="text-[10px] text-white/50 font-sans tracking-[0.15em]">{primaryEmail}</p>
                </div>
                <div className="px-4 py-5 flex flex-col gap-1">
                  <button
                    onClick={() => setActiveTab("orders")}
                    className={`w-full flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] font-bold px-4 py-4 border-l-2 transition-all duration-300 ${
                      activeTab === "orders" ? "border-gold bg-warm-gray/60 text-charcoal" : "border-transparent text-charcoal/50 hover:text-charcoal hover:bg-warm-gray/40"
                    }`}
                  >
                    <Package className="w-4 h-4" strokeWidth={1.5} /> Order History
                  </button>
                  <button
                    onClick={() => setActiveTab("profile")}
                    className={`w-full flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] font-bold px-4 py-4 border-l-2 transition-all duration-300 ${
                      activeTab === "profile" ? "border-gold bg-warm-gray/60 text-charcoal" : "border-transparent text-charcoal/50 hover:text-charcoal hover:bg-warm-gray/40"
                    }`}
                  >
                    <User className="w-4 h-4" strokeWidth={1.5} /> Profile Settings
                  </button>
                  <div className="h-px w-full bg-charcoal/10 my-2" />
                  <button
                    onClick={() => signOut({ redirectUrl: "/" })}
                    className="w-full flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] font-bold px-4 py-4 border-l-2 border-transparent text-charcoal/40 hover:text-destructive hover:bg-destructive/5 transition-all duration-300"
                  >
                    <LogOut className="w-4 h-4" strokeWidth={1.5} /> Sign Out
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-3">
              {activeTab === "orders" && (
                <div className="animate-fade-in">
                  <div className="mb-8 border-b border-charcoal/10 pb-6">
                    <p className="eyebrow mb-3">Your Archive</p>
                    <h1 className="font-serif text-4xl md:text-5xl font-light text-charcoal">
                      Order <span className="italic">History</span>
                    </h1>
                  </div>

                  {ordersNotice && !ordersLoading && (
                    <div className="mb-6 p-4 bg-white border border-gold/25 border-l-2 border-l-gold text-charcoal/70 text-xs font-medium">
                      {ordersNotice}
                    </div>
                  )}

                  {ordersLoading ? (
                    <div className="flex justify-center py-24">
                      <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="panel-luxe frame-luxe p-14 text-center">
                      <Package className="w-12 h-12 text-gold/40 mx-auto mb-6" strokeWidth={1} />
                      <h3 className="font-serif text-3xl font-light text-charcoal mb-3">
                        No orders <span className="italic">yet</span>
                      </h3>
                      <p className="text-charcoal/60 text-sm max-w-sm mx-auto mb-8 leading-relaxed">
                        Your bespoke journey awaits. Once you make a purchase, your orders will appear here for seamless tracking.
                      </p>
                      <button onClick={() => router.push("/shop")} className="btn-luxe">
                        Discover Collections <ArrowRight className="w-3.5 h-3.5" />
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
                            className="panel-luxe p-6 lg:p-8 hover:border-gold/40 transition-colors duration-300"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-6 mb-6 pb-6 border-b border-charcoal/5">
                              <div>
                                <div className="flex items-center gap-3 mb-2">
                                  <p className="font-serif text-xl text-charcoal">
                                    Order {order.name}
                                  </p>
                                  <span className="inline-flex px-3 py-1 border border-gold/40 text-[9px] uppercase tracking-[0.18em] text-gold-dark font-bold">
                                    {order.financial_status}
                                  </span>
                                </div>
                                <p className="text-sm text-charcoal/60 font-sans">
                                  Placed on {date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-serif text-2xl font-light text-charcoal mb-2">
                                  {formatPrice(total)}
                                </p>
                                {order.fulfillment_status && (
                                  <span className="inline-block px-3 py-1 bg-charcoal text-[9px] uppercase tracking-[0.18em] text-white font-bold">
                                    {order.fulfillment_status}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="space-y-4">
                              {order.line_items.map((item) => (
                                <div key={item.id} className="flex justify-between items-center border-b border-charcoal/5 last:border-0 py-3 px-1">
                                  <div className="flex items-center gap-4">
                                    <div className="w-9 h-9 border border-charcoal/15 flex items-center justify-center text-[10px] font-bold text-charcoal/70 tabular-nums">
                                      x{item.quantity}
                                    </div>
                                    <div>
                                      <p className="font-medium text-charcoal text-sm">{item.title}</p>
                                      {item.variant_title && (
                                        <p className="text-xs text-charcoal/50 mt-1">{item.variant_title}</p>
                                      )}
                                    </div>
                                  </div>
                                  <p className="font-serif text-sm text-charcoal">
                                    {formatPrice(Number(item.price))}
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
                <div className="animate-fade-in panel-luxe p-8 lg:p-12">
                  <div className="mb-10 border-b border-charcoal/10 pb-6">
                    <p className="eyebrow mb-3">Personal</p>
                    <h1 className="font-serif text-4xl font-light text-charcoal">
                      Profile <span className="italic">Settings</span>
                    </h1>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="max-w-md space-y-8">
                    <div>
                      <label className="field-label">Primary Email</label>
                      <input 
                        type="email" 
                        value={primaryEmail || ""} 
                        disabled 
                        className="field-luxe"
                        readOnly
                      />
                      <p className="text-[10px] text-charcoal/40 mt-2 font-medium">Email address cannot be changed directly.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="field-label">First Name</label>
                        <input 
                          type="text" 
                          value={firstName} 
                          onChange={(e) => setFirstName(e.target.value)}
                          className="field-luxe"
                          placeholder="Your first name"
                        />
                      </div>
                      <div>
                        <label className="field-label">Last Name</label>
                        <input 
                          type="text" 
                          value={lastName} 
                          onChange={(e) => setLastName(e.target.value)}
                          className="field-luxe"
                          placeholder="Your last name"
                        />
                      </div>
                    </div>

                    {updateMessage && (
                      <div className={`p-4 border text-xs font-medium ${updateMessage.includes("success") ? "border-gold/40 border-l-2 border-l-gold bg-warm-gray/50 text-charcoal" : "border-destructive/30 border-l-2 border-l-destructive bg-destructive/5 text-destructive"}`}>
                        {updateMessage}
                      </div>
                    )}

                    <button 
                      type="submit" 
                      disabled={isUpdating}
                      className="btn-luxe min-w-[200px]"
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

/* ── Graceful fallback when auth isn't configured ────────────────────────── */

function AccountUnavailable() {
  return (
    <div className="bg-warm-white min-h-screen text-charcoal font-sans flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center px-6 pt-32 pb-24 text-center">
        <p className="eyebrow eyebrow--bare mb-4">Accounts</p>
        <h1 className="font-serif text-5xl md:text-6xl font-light mb-5">
          Coming <span className="italic">very soon</span>
        </h1>
        <p className="text-charcoal/60 max-w-md mb-10 leading-relaxed">
          Customer accounts aren&apos;t enabled on this storefront yet. You can
          still browse the full collection and check out as a guest.
        </p>
        <Link href="/shop" className="btn-luxe">
          Continue Shopping <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </main>
      <Footer />
    </div>
  );
}

export default function AccountPage() {
  if (!isAuthEnabled) return <AccountUnavailable />;
  return <AccountInner />;
}
