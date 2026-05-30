// src/pages/ContactPage.jsx
import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const ContactPage = () => {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.email || !formData.message) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("contact_requests").insert({
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone || null,
        pack_name: "Contact général",
        pack_type: "contact",
        message: formData.message,
        status: "pending",
      });
      if (error) throw error;
      toast.success("Message envoyé ! Nous vous répondrons rapidement.");
      setFormData({ full_name: "", email: "", phone: "", message: "" });
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'envoi. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Contact - SIGEF App</title>
        <meta name="description" content="Contactez-nous pour toute question sur nos solutions de formation." />
      </Helmet>
      <div className="min-h-screen flex flex-col bg-black text-gray-100">
        <Header />
        <main className="flex-1">
          {/* Hero simple */}
          <section className="relative bg-black py-20 px-6 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 opacity-30"></div>
            <div className="max-w-4xl mx-auto text-center relative z-10">
              <h1 className="text-5xl md:text-6xl font-bold mb-6 text-white">Contactez-nous</h1>
              <p className="text-xl text-gray-300">
                Une question ? Un projet ? N'hésitez pas à nous écrire. Nous vous répondrons sous 24h.
              </p>
            </div>
          </section>

          <div className="container mx-auto px-4 py-12 max-w-6xl">
            <div className="grid md:grid-cols-2 gap-12">
              {/* Formulaire */}
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold mb-6 text-white">Envoyez-nous un message</h2>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label className="text-gray-300">Nom complet *</Label>
                      <Input
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        required
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Email *</Label>
                      <Input
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Téléphone</Label>
                      <Input
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Message *</Label>
                      <Textarea
                        name="message"
                        rows={5}
                        value={formData.message}
                        onChange={handleChange}
                        required
                        placeholder="Décrivez votre projet ou votre question..."
                        className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                      />
                    </div>
                    <Button type="submit" disabled={submitting} className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                      {submitting ? "Envoi..." : <><Send className="w-4 h-4 mr-2" /> Envoyer</>}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Infos de contact */}
              <div className="space-y-6">
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-bold mb-6 text-white">Nos coordonnées</h2>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Mail className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <p className="font-medium">Email</p>
                          <a href="mailto:contact@sigef.app" className="text-gray-400 hover:text-primary">contact@sigef.app</a>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Phone className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <p className="font-medium">Téléphone</p>
                          <a href="tel:+22600000000" className="text-gray-400 hover:text-primary">+226 00 00 00 00</a>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <p className="font-medium">Adresse</p>
                          <p className="text-gray-400">Ouagadougou, Burkina Faso</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-bold mb-4 text-white">Horaires d'ouverture</h2>
                    <div className="space-y-2 text-gray-400">
                      <p>Lundi - Vendredi : 8h00 - 18h00</p>
                      <p>Samedi : 9h00 - 13h00</p>
                      <p>Dimanche : Fermé</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default ContactPage;