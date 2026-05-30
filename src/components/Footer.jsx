import React from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
} from "lucide-react";
import { useAdminConfig } from "@/contexts/AdminConfigContext.jsx";
import { getFileUrl } from "@/lib/supabaseClient.js";

const Footer = () => {
  const { config, loading } = useAdminConfig();

  const siteName = config?.site_name || "SIGEF";
  const siteColorPrimary = config?.site_color_primary || "#1a56db";
  const footerText =
    config?.footer_text ||
    config?.site_description ||
    "Plateforme de formation professionnelle pour les candidats au concours direct et professionnel.";
  const contactEmail = config?.contact_email || "contact@sigef.app";
  const contactPhone = config?.contact_phone || "+226 00 00 00 00 00";
  const contactAddress = config?.contact_address || "Ouagadougou, Burkina Faso";
  const logoUrl = config?.footer_logo_url || config?.site_logo_url || null;
  const socialMedia = config?.social_media || {};
  const footerBgColor = config?.footer_background_color || "";
  const footerTextColor = config?.footer_text_color || "";
  const footerClasses = footerBgColor
    ? "border-t"
    : "bg-muted text-muted-foreground border-t";
  const footerStyle = footerBgColor
    ? { backgroundColor: footerBgColor, color: footerTextColor || "#ffffff" }
    : {};

  const quickLinks = config?.quick_links || [
    { name: "Accueil", path: "/" },
    { name: "Connexion", path: "/login" },
    { name: "Inscription", path: "/signup" },
    { name: "Tarifs", path: "/pricing" }, // ✅ Lien vers les tarifs ajouté
  ];

  return (
    <footer className={footerClasses} style={footerStyle}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          {/* Colonne 1: Logo et description */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={`Logo ${siteName}`}
                  className="h-8 w-auto object-contain"
                />
              ) : (
                <Shield
                  className="h-8 w-8"
                  style={{ color: siteColorPrimary }}
                />
              )}
              <span className="text-xl font-bold">
                {loading ? "Chargement..." : siteName}
              </span>
            </div>
            <p className="text-base leading-relaxed opacity-90">{footerText}</p>

            {(socialMedia.facebook_url ||
              socialMedia.twitter_url ||
              socialMedia.instagram_url ||
              socialMedia.linkedin_url ||
              socialMedia.youtube_url) && (
              <div className="flex items-center gap-4 pt-2">
                {socialMedia.facebook_url && (
                  <a
                    href={socialMedia.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-80 hover:opacity-100 transition-opacity"
                    aria-label="Facebook"
                  >
                    <Facebook className="w-5 h-5" />
                  </a>
                )}
                {socialMedia.twitter_url && (
                  <a
                    href={socialMedia.twitter_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-80 hover:opacity-100 transition-opacity"
                    aria-label="Twitter"
                  >
                    <Twitter className="w-5 h-5" />
                  </a>
                )}
                {socialMedia.instagram_url && (
                  <a
                    href={socialMedia.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-80 hover:opacity-100 transition-opacity"
                    aria-label="Instagram"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
                {socialMedia.linkedin_url && (
                  <a
                    href={socialMedia.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-80 hover:opacity-100 transition-opacity"
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="w-5 h-5" />
                  </a>
                )}
                {socialMedia.youtube_url && (
                  <a
                    href={socialMedia.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-80 hover:opacity-100 transition-opacity"
                    aria-label="YouTube"
                  >
                    <Youtube className="w-5 h-5" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Colonne 2: Liens rapides */}
          <div>
            <h3 className="text-base font-bold mb-4 uppercase tracking-wider opacity-100">
              {config?.quick_links_title || "Liens rapides"}
            </h3>
            <ul className="space-y-3 text-base opacity-90">
              {quickLinks.map((link, index) => (
                <li key={index}>
                  <Link
                    to={link.path}
                    className="hover:underline transition-colors inline-flex min-h-[32px] items-center"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Colonne 3: Contact */}
          <div>
            <h3 className="text-base font-bold mb-4 uppercase tracking-wider opacity-100">
              {config?.contact_title || "Contact"}
            </h3>
            <ul className="space-y-4 text-base opacity-90">
              {contactEmail && (
                <li className="flex items-start gap-3">
                  <Mail className="h-5 w-5 shrink-0 mt-0.5" />
                  <span className="break-all">{contactEmail}</span>
                </li>
              )}
              {contactPhone && (
                <li className="flex items-start gap-3">
                  <Phone className="h-5 w-5 shrink-0 mt-0.5" />
                  <span>{contactPhone}</span>
                </li>
              )}
              {contactAddress && (
                <li className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 shrink-0 mt-0.5" />
                  <span>{contactAddress}</span>
                </li>
              )}
            </ul>
          </div>

          {/* Colonne 4: Horaires / Newsletter */}
          <div>
            {config?.opening_hours && (
              <>
                <h3 className="text-base font-bold mb-4 uppercase tracking-wider opacity-100">
                  {config?.opening_hours_title || "Horaires"}
                </h3>
                <div className="space-y-2 text-base opacity-90 whitespace-pre-line">
                  {config.opening_hours}
                </div>
              </>
            )}
            {config?.newsletter_enabled && (
              <div className="mt-4">
                <h3 className="text-base font-bold mb-4 uppercase tracking-wider opacity-100">
                  Newsletter
                </h3>
                <form className="flex flex-col gap-2">
                  <input
                    type="email"
                    placeholder="Votre email"
                    className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
                  />
                  <button
                    className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                    style={{ backgroundColor: siteColorPrimary }}
                  >
                    S'abonner
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-current/20 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-6 text-sm sm:text-base opacity-80">
          <p className="text-center md:text-left">
            &copy; {new Date().getFullYear()} {siteName}.{" "}
            {config?.copyright_text || "Tous droits réservés."}
          </p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            {config?.privacy_url && (
              <Link
                to={config.privacy_url}
                className="hover:underline transition-colors p-2 -m-2"
              >
                Confidentialité
              </Link>
            )}
            {config?.terms_url && (
              <Link
                to={config.terms_url}
                className="hover:underline transition-colors p-2 -m-2"
              >
                Conditions
              </Link>
            )}
            {config?.cookies_url && (
              <Link
                to={config.cookies_url}
                className="hover:underline transition-colors p-2 -m-2"
              >
                Cookies
              </Link>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;