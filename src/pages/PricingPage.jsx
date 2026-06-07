// src/pages/PricingPage.jsx
import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle, Crown, Sparkles, ArrowRight, Zap, TrendingUp, Star } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const PricingPage = () => {
  const [selectedPack, setSelectedPack] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const packs = [
    {
      name: "Starter",
      priceMonth: "15 000 FCFA",
      priceYear: "150 000 FCFA",
      description: "Idéal pour petits centres de formation",
      features: [
        "1 administrateur",
        "100 apprenants",
        "10 formateurs",
        "Gestion des formations",
        "Documents pédagogiques",
        "Support standard",
      ],
      color: "from-blue-600 to-blue-400",
      icon: Sparkles,
    },
    {
      name: "Business",
      priceMonth: "35 000 FCFA",
      priceYear: "350 000 FCFA",
      description: "Pour écoles et instituts professionnels",
      features: [
        "2 administrateurs",
        "1000 apprenants",
        "Formateurs illimités",
        "Classes virtuelles",
        "Examens et évaluations",
        "Sous-domaine personnalisé",
      ],
      popular: true,
      color: "from-purple-600 to-pink-500",
      icon: Zap,
    },
    {
      name: "Premium",
      priceMonth: "75 000 FCFA",
      priceYear: "750 000 FCFA",
      description: "Pour universités et grandes structures",
      features: [
        "2 Administrateurs",
        "Apprenants illimités",
        "Formation en ligne complète",
        "Gestion multi-campus",
        "Rapports avancés",
        "API & intégrations",
      ],
      color: "from-amber-600 to-orange-500",
      icon: Crown,
    },
  ];

  const options = [
    { title: "Domaine personnalisé", price: "100 000 FCFA" },
    { title: "Application Android", price: "500 000 FCFA" },
    { title: "Application iOS", price: "700 000 FCFA" },
    { title: "Formation du personnel", price: "50 000 FCFA / Séance" },
    { title: "Hébergement Premium", price: "20 000 FCFA / mois" },
    { title: "Paiement Mobile Money", price: "150 000 FCFA" },
  ];

  const resellerOffers = [
    { name: "Offre Revendeur - Mensuel", price: "120 000 FCFA", period: "Par mois" },
    { name: "Offre Revendeur - Annuel", price: "1 200 000 FCFA", period: "Par an", popular: true },
    { name: "Offre Revendeur - Licence Complète", price: "5 500 000 FCFA", period: "Achat définitif" },
  ];

  const openPackModal = (pack) => {
    setSelectedPack(pack);
    setSelectedOption(null);
    setFormData({ full_name: "", email: "", phone: "", message: "" });
    setIsModalOpen(true);
  };

  const openOptionModal = (option) => {
    setSelectedOption(option);
    setSelectedPack(null);
    setFormData({ full_name: "", email: "", phone: "", message: "" });
    setIsModalOpen(true);
  };

  const openResellerModal = (offer) => {
    setSelectedPack({ name: offer.name, description: offer.period, price: offer.price });
    setSelectedOption(null);
    setFormData({ full_name: "", email: "", phone: "", message: "" });
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.email) {
      toast.error("Veuillez remplir votre nom et email");
      return;
    }
    setSubmitting(true);

    const packName = selectedPack ? selectedPack.name : selectedOption.title;
    const packType = selectedPack ? (selectedPack.name.includes("Revendeur") ? "reseller" : "pack") : "option";

    try {
      const { error } = await supabase.from("contact_requests").insert({
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone || null,
        pack_name: packName,
        pack_type: packType,
        message: formData.message || null,
        status: "pending",
      });
      if (error) throw error;

      toast.success("Votre demande a été envoyée ! Nous vous contacterons rapidement.");
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l’envoi. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Tarifs - SIGEF App</title>
        <meta name="description" content="Découvrez nos packs tarifaires adaptés à votre établissement." />
      </Helmet>
      <div className="min-h-screen flex flex-col bg-black text-gray-100">
        <Header />
        <main className="flex-1">
          {/* Hero Section */}
          <section className="relative bg-black py-20 px-6 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 opacity-30"></div>
            <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl"></div>
            <div className="max-w-7xl mx-auto text-center relative z-10">
              <Badge className="mb-6 bg-primary/20 text-primary border-primary/30 px-4 py-1 text-sm font-semibold">
                <Sparkles className="w-3 h-3 mr-1 inline" /> Solutions sur mesure
              </Badge>
              <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-primary to-secondary bg-clip-text text-transparent">
                SIGEF App
              </h1>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                Plateforme SaaS multi-tenant de gestion académique et formation en ligne.
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white px-8 py-6 text-lg rounded-2xl shadow-lg transition-transform hover:scale-105" asChild>
                  <a href="#packs">Commencer Maintenant</a>
                </Button>
                <Button variant="outline" className="border-gray-600 text-gray-200 hover:bg-gray-800 px-8 py-6 text-lg rounded-2xl transition-transform hover:scale-105" asChild>
                  <a href="/contact">Demander une Démo</a>
                </Button>
              </div>
            </div>
          </section>

          {/* Packs Section */}
          <section id="packs" className="py-20 px-6 bg-gradient-to-b from-black to-gray-900">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <Badge variant="secondary" className="mb-4 bg-gray-800 text-gray-300 border-none">
                  <TrendingUp className="w-3 h-3 mr-1" /> Choisissez votre formule
                </Badge>
                <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
                  Des packs adaptés à <span className="text-primary">votre ambition</span>
                </h2>
                <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                  Que vous soyez un petit centre ou une grande université, nous avons la solution idéale.
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-8">
                {packs.map((pack, idx) => {
                  const Icon = pack.icon;
                  return (
                    <Card key={idx} className={`relative overflow-hidden transition-all duration-500 hover:scale-105 hover:shadow-2xl bg-gradient-to-br from-gray-900 to-black border-gray-800 ${pack.popular ? "ring-2 ring-primary shadow-xl shadow-primary/20 scale-105 z-10" : ""}`}>
                      {pack.popular && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-primary to-secondary text-white px-6 py-1.5 rounded-full text-sm font-semibold shadow-lg z-20">
                          <Star className="w-3 h-3 inline mr-1 fill-current" /> Plus Populaire
                        </div>
                      )}
                      <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${pack.color} opacity-10 rounded-full blur-2xl -mr-20 -mt-20`}></div>
                      <CardHeader className="text-center pb-4">
                        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-700 flex items-center justify-center mb-4 shadow-lg">
                          <Icon className="w-8 h-8 text-primary" />
                        </div>
                        <CardTitle className="text-3xl font-bold text-white">{pack.name}</CardTitle>
                        <p className="text-gray-400 mt-2">{pack.description}</p>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-3">
                          <div className="bg-gray-800/50 rounded-xl p-3 text-center backdrop-blur-sm border border-gray-700">
                            <p className="text-sm text-gray-400">Mensuel</p>
                            <p className="text-2xl font-bold text-white">{pack.priceMonth}</p>
                          </div>
                          <div className="bg-gray-800/50 rounded-xl p-3 text-center backdrop-blur-sm border border-gray-700">
                            <p className="text-sm text-gray-400">Annuel</p>
                            <p className="text-2xl font-bold text-white">{pack.priceYear}</p>
                            <p className="text-xs text-green-400">Économisez 2 mois</p>
                          </div>
                          <div className="bg-primary/10 rounded-xl p-3 text-center border border-primary/30">
                            <p className="text-sm text-primary">Achat Unique</p>
                            <p className="text-2xl font-bold text-primary">{pack.oneTime}</p>
                            <p className="text-xs text-primary/80">Licence à vie</p>
                          </div>
                        </div>
                        <ul className="space-y-3">
                          {pack.features.map((feat, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
                              <span className="text-sm text-gray-300">{feat}</span>
                            </li>
                          ))}
                        </ul>
                        <Button className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-semibold" onClick={() => openPackModal(pack)}>
                          Choisir ce pack <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Options supplémentaires */}
          <section className="py-20 px-6 bg-gray-950">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-14">
                <h2 className="text-4xl font-bold mb-4 text-white">Options Supplémentaires</h2>
                <p className="text-gray-400 text-lg">Ajoutez des fonctionnalités avancées selon vos besoins.</p>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                {options.map((option, idx) => (
                  <Card key={idx} className="bg-gray-900 border-gray-800 hover:border-primary/50 hover:shadow-xl transition-all cursor-pointer group" onClick={() => openOptionModal(option)}>
                    <CardContent className="p-6 text-center">
                      <h3 className="text-xl font-bold mb-3 text-white group-hover:text-primary transition">{option.title}</h3>
                      <p className="text-primary text-2xl font-bold">{option.price}</p>
                      <Button variant="link" className="mt-3 text-gray-400 group-hover:text-primary">Demander</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Offre Revendeur avec boutons "Demander" */}
          <section className="py-20 px-6 bg-gradient-to-r from-indigo-950 to-blue-950 text-white">
            <div className="max-w-6xl mx-auto text-center">
              <h2 className="text-4xl font-bold mb-6">Offre Revendeur / Super Admin</h2>
              <p className="text-lg max-w-4xl mx-auto leading-relaxed mb-10 text-gray-300">
                Obtenez la plateforme principale SIGEF App et commercialisez vos propres espaces administrateurs.
                Gérez plusieurs écoles, centres et institutions avec un contrôle total.
              </p>
              <div className="grid md:grid-cols-3 gap-6">
                {resellerOffers.map((offer, idx) => (
                  <Card key={idx} className={`bg-white/10 backdrop-blur-sm border-white/20 text-white ${offer.popular ? "bg-gradient-to-br from-primary to-secondary shadow-2xl scale-105" : ""}`}>
                    <CardContent className="p-8 text-center">
                      <h3 className="text-2xl font-bold mb-4">{offer.name.replace("Offre Revendeur - ", "")}</h3>
                      <p className="text-4xl font-bold mb-3">{offer.price}</p>
                      <p className="text-sm opacity-80 mb-6">{offer.period}</p>
                      {offer.popular && <Badge className="mt-2 bg-white/20">Économie 2 mois</Badge>}
                      <Button
                        variant="outline"
                        className="mt-6 border-white text-white hover:bg-white hover:text-blue-900 transition"
                        onClick={() => openResellerModal(offer)}
                      >
                        Demander
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* CTA Final */}
          <section className="py-20 px-6 bg-gray-950">
            <div className="max-w-5xl mx-auto text-center">
              <h2 className="text-4xl font-bold mb-6 text-white">Lancez Votre Plateforme de Formation Dès Aujourd’hui</h2>
              <p className="text-lg text-gray-400 mb-10 max-w-3xl mx-auto">
                SIGEF App vous permet de gérer facilement vos formations, apprenants et administrateurs dans un environnement sécurisé et moderne.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white px-8 py-4 text-lg rounded-2xl" asChild>
                  <a href="/contact">Nous Contacter</a>
                </Button>
                <Button variant="outline" className="border-gray-600 text-gray-200 hover:bg-gray-800 px-8 py-4 text-lg rounded-2xl" asChild>
                  <a href="/pricing#packs">Voir une Démonstration</a>
                </Button>
              </div>
            </div>
          </section>
        </main>
        <Footer />

        {/* Modal Formulaire */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-md bg-gray-900 border-gray-800 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">
                {selectedPack
                  ? `Demande pour ${selectedPack.name}`
                  : `Demande pour ${selectedOption?.title}`}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Remplissez ce formulaire, nous vous contacterons rapidement pour concrétiser votre projet.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-gray-300">Nom complet *</Label>
                <Input name="full_name" value={formData.full_name} onChange={handleInputChange} required className="bg-gray-800 border-gray-700 text-white" />
              </div>
              <div>
                <Label className="text-gray-300">Email *</Label>
                <Input name="email" type="email" value={formData.email} onChange={handleInputChange} required className="bg-gray-800 border-gray-700 text-white" />
              </div>
              <div>
                <Label className="text-gray-300">Téléphone</Label>
                <Input name="phone" value={formData.phone} onChange={handleInputChange} className="bg-gray-800 border-gray-700 text-white" />
              </div>
              <div>
                <Label className="text-gray-300">Message (optionnel)</Label>
                <Textarea name="message" rows={3} value={formData.message} onChange={handleInputChange} placeholder="Précisez vos besoins..." className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="border-gray-600 text-gray-300">
                  Annuler
                </Button>
                <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary/90">
                  {submitting ? "Envoi..." : "Envoyer la demande"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default PricingPage;