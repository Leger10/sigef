// src/components/admin/DocumentGenerator.jsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  FileText, Download, Printer, FileSignature, 
  Receipt, FileCheck, GraduationCap, Handshake, 
  Crown, Save, ChevronRight, Users, Building2, UserCog, Wrench
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const DocumentGenerator = () => {
  const [activeMainTab, setActiveMainTab] = useState('client');
  const [activeSubTab, setActiveSubTab] = useState('info');

  // Données Client
  const [clientData, setClientData] = useState({
    clientName: '',
    clientAddress: '',
    clientEmail: '',
    clientPhone: '',
    clientRepresentative: '',
    clientSiret: '',
    city: '',
    contractNumber: `SIGEF-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
    contractDate: new Date().toISOString().split('T')[0],
    packName: 'Business',
    packPeriod: 'annuel',
    options: [],
    paymentMethod: 'virement',
    trainingDate: '',
    trainingDuration: '4',
    trainerName: '',
    participants: [],
  });

  // Données Revendeur
  const [resellerData, setResellerData] = useState({
    companyName: '',
    companyAddress: '',
    companyEmail: '',
    companyPhone: '',
    legalRepresentative: '',
    companySiret: '',
    city: '',
    contractNumber: `REV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
    contractDate: new Date().toISOString().split('T')[0],
    resellerOffer: 'annuel',
    subPacks: ['Starter', 'Business', 'Premium'],
    wantsMaintenance: false,
    maintenancePack: 'essentiel',
    // commissionRate: '20',
    notes: '',
  });

  // Packs Client
  const clientPacks = [
    { name: 'Starter', price: '15000', yearlyPrice: '150000', learners: '100', features: ['100 apprenants', '10 formateurs', 'Gestion des formations', 'Documents pédagogiques', 'Support standard'] },
    { name: 'Business', price: '35000', yearlyPrice: '350000', learners: '1000', features: ['1000 apprenants', 'Formateurs illimités', 'Classes virtuelles', 'Examens et évaluations', 'Support VIP', 'Assistance 24H/24'] },
    { name: 'Premium', price: '75000', yearlyPrice: '750000', learners: 'Illimités', features: ['Apprenants illimités', 'Formation en ligne complète', 'Gestion multi-campus', 'Rapports avancés', 'Formateurs illimités', 'Classes virtuelles', 'Examens et évaluations', 'Support VIP', 'Assistance 24H/24'] },
  ];

  // Options disponibles
  const availableOptions = [
    { name: 'Domaine personnalisé', price: '100000', type: 'Paiement unique' },
    { name: 'Application Android', price: '500000', type: 'Paiement unique' },
    { name: 'Application iOS', price: '700000', type: 'Paiement unique' },
    { name: 'Formation du personnel', price: '50000', type: 'Par séance' },
    { name: 'Hébergement Premium', price: '20000', type: 'Par mois' },
    { name: 'Paiement Mobile Money', price: '150000', type: 'Paiement unique' },
  ];

  // Offres Revendeur
  const resellerOffers = {
    mensuel: { name: 'Offre Revendeur Mensuelle', price: '120000', period: 'mois', description: 'Paiement mensuel' },
    annuel: { name: 'Offre Revendeur Annuelle', price: '1200000', period: 'an', description: 'Économie de 2 mois' },
    lifetime: { name: 'Licence Complète Revendeur', price: '5500000', period: 'définitif', description: 'Achat unique - Licence perpétuelle' },
  };

  const maintenancePacks = {
    essentiel: { name: 'Pack Essentiel', price: '300000', features: ['Mises à jour sécurité', 'Support technique'] },
    premium: { name: 'Pack Premium', price: '500000', features: ['Mises à jour sécurité', 'Support technique', 'Évolutions mineures'] },
  };

  // Handlers Client
  const handleClientInputChange = (e) => {
    setClientData({ ...clientData, [e.target.name]: e.target.value });
  };

  const handleClientOptionToggle = (option) => {
    if (clientData.options.includes(option.name)) {
      setClientData({ ...clientData, options: clientData.options.filter(o => o !== option.name) });
    } else {
      setClientData({ ...clientData, options: [...clientData.options, option.name] });
    }
  };

  const addParticipant = () => {
    setClientData({ ...clientData, participants: [...clientData.participants, { name: '', function: '' }] });
  };

  const updateParticipant = (index, field, value) => {
    const newParticipants = [...clientData.participants];
    newParticipants[index][field] = value;
    setClientData({ ...clientData, participants: newParticipants });
  };

  // Handlers Revendeur
  const handleResellerInputChange = (e) => {
    setResellerData({ ...resellerData, [e.target.name]: e.target.value });
  };

  const handleSubPackToggle = (packName) => {
    if (resellerData.subPacks.includes(packName)) {
      setResellerData({ ...resellerData, subPacks: resellerData.subPacks.filter(p => p !== packName) });
    } else {
      setResellerData({ ...resellerData, subPacks: [...resellerData.subPacks, packName] });
    }
  };

  // Utilitaires
  const parsePrice = (priceString) => {
    if (!priceString) return 0;
    if (typeof priceString === 'number') return priceString;
    return parseInt(String(priceString).replace(/\s/g, ''), 10);
  };

  const calculateClientTotal = () => {
    const selectedPack = clientPacks.find(p => p.name === clientData.packName);
    let total = selectedPack ? (clientData.packPeriod === 'annuel' ? parsePrice(selectedPack.yearlyPrice) : parsePrice(selectedPack.price)) : 0;
    clientData.options.forEach(opt => {
      const option = availableOptions.find(o => o.name === opt);
      if (option) total += parsePrice(option.price);
    });
    return total;
  };

  const getClientTVA = () => Math.floor(calculateClientTotal() * 0.18);
  const getClientTotalTTC = () => calculateClientTotal() + getClientTVA();

  const getResellerPrice = () => {
    const offer = resellerOffers[resellerData.resellerOffer];
    return offer ? parsePrice(offer.price) : 0;
  };

  const formatNumber = (num) => num.toLocaleString('fr-FR');

  // Impression
  const printDocument = (documentType, title, isReseller = false) => {
    const data = isReseller ? resellerData : clientData;
    const companyName = isReseller ? data.companyName : data.clientName;
    
    if (!companyName) {
      toast.error(`Veuillez remplir le nom du ${isReseller ? 'revendeur' : 'client'}`);
      setActiveSubTab('info');
      return;
    }

    const printContent = getDocumentHTML(documentType, isReseller);
    
    const printWindow = window.open('', '_blank', 'width=800,height=600,toolbar=yes,scrollbars=yes');
    if (!printWindow) {
      toast.error("Veuillez autoriser les popups pour l'impression");
      return;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - ${companyName}</title>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page { size: A4; margin: 15mm; }
            body { 
              font-family: 'Times New Roman', Arial, sans-serif; 
              font-size: 12px;
              line-height: 1.4;
              color: #000;
              background: white;
              padding: 10mm;
            }
            .document-container { max-width: 170mm; margin: 0 auto; }
            h1 { text-align: center; color: #1a56db; font-size: 22px; margin-bottom: 10px; }
            h2 { text-align: center; color: #333; font-size: 16px; margin-bottom: 20px; }
            h3 { font-size: 14px; margin: 15px 0 10px 0; color: #1a56db; }
            hr { margin: 15px 0; border: 0.5px solid #ddd; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { border: 1px solid #999; padding: 8px; text-align: left; font-size: 11px; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .footer { margin-top: 40px; text-align: center; font-size: 9px; color: #666; }
            .price-highlight { color: #1a56db; font-weight: bold; font-size: 14px; }
            .signature-section { margin-top: 50px; }
            .signature-line { margin-top: 40px; border-top: 1px dashed #999; padding-top: 10px; }
            ul, ol { margin: 10px 0 10px 25px; }
            li { margin: 5px 0; }
            p { margin: 8px 0; }
            .company-header { text-align: right; font-size: 10px; margin-bottom: 20px; }
            .page-break { page-break-before: always; }
            .avoid-break { page-break-inside: avoid; }
          </style>
        </head>
        <body>
          <div class="document-container">
            ${printContent}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() { window.close(); }, 1000);
              }, 500);
            };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
    toast.success(`Impression lancée pour ${title}`);
  };

  // Génération PDF
  const generatePDF = async (documentType, title, isReseller = false) => {
    const data = isReseller ? resellerData : clientData;
    const companyName = isReseller ? data.companyName : data.clientName;
    
    if (!companyName) {
      toast.error(`Veuillez remplir le nom du ${isReseller ? 'revendeur' : 'client'}`);
      setActiveSubTab('info');
      return;
    }

    toast.loading("Génération du PDF en cours...");
    
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = '800px';
    container.style.backgroundColor = 'white';
    container.style.padding = '30px';
    container.style.fontFamily = "'Times New Roman', Arial, sans-serif";
    container.style.fontSize = '12px';
    container.style.color = '#000';
    container.style.zIndex = '-1';
    container.style.opacity = '0';
    container.innerHTML = getDocumentHTML(documentType, isReseller);
    document.body.appendChild(container);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const canvas = await html2canvas(container, {
        scale: 3,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const imgWidth = 180;
      const pageHeight = 277;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 15;
      
      pdf.addImage(imgData, 'PNG', 15, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 15, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`${documentType}_${companyName.replace(/\s/g, '_')}_${data.contractDate}.pdf`);
      toast.dismiss();
      toast.success(`${title} généré avec succès !`);
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.dismiss();
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      document.body.removeChild(container);
    }
  };

  const getDocumentHTML = (type, isReseller = false) => {
    if (isReseller) {
      return getResellerDocumentHTML(type);
    }
    return getClientDocumentHTML(type);
  };

  // ==================== DOCUMENTS CLIENT ====================
  const getClientDocumentHTML = (type) => {
    const selectedPack = clientPacks.find(p => p.name === clientData.packName);
    const totalHT = calculateClientTotal();
    const tva = getClientTVA();
    const totalTTC = getClientTotalTTC();
    const isYearly = clientData.packPeriod === 'annuel';
    const packPrice = isYearly ? selectedPack?.yearlyPrice : selectedPack?.price;
    const packPriceValue = parsePrice(packPrice);

    switch(type) {
      case 'devis':
        return `
          <div class="company-header">
            <strong>SIGEF APP SAS</strong><br/>
            contact@sigefapp.com<br/>
            N° SIRET: 123 456 789
          </div>
          <h1>DEVIS COMMERCIAL</h1>
          <h2>Plateforme SaaS Multi-tenant SIGEF APP</h2>
          <hr/>
          <p><strong>Devis N° :</strong> ${clientData.contractNumber}</p>
          <p><strong>Date d'émission :</strong> ${clientData.contractDate}</p>
          <p><strong>Validité :</strong> 30 jours</p>
          <br/>
          <p><strong>Client :</strong> ${clientData.clientName || '_________________________'}</p>
          <p><strong>Adresse :</strong> ${clientData.clientAddress || '_________________________'}</p>
          <p><strong>Email :</strong> ${clientData.clientEmail || '_________________________'}</p>
          <p><strong>Tél :</strong> ${clientData.clientPhone || '_________________________'}</p>
          <p><strong>Représentant :</strong> ${clientData.clientRepresentative || '_________________________'}</p>
          <p><strong>N° SIRET :</strong> ${clientData.clientSiret || 'Non renseigné'}</p>
          <br/>
          <h3>Détail des prestations :</h3>
          <table>
            <thead><tr><th>Désignation</th><th>Qté</th><th>Prix unitaire</th><th>Total</th></tr></thead>
            <tbody>
              <tr>
                <td><strong>Pack ${selectedPack?.name}</strong><br/>${selectedPack?.learners} apprenants - ${isYearly ? 'Abonnement annuel' : 'Abonnement mensuel'}</td>
                <td>1</td>
                <td>${formatNumber(packPriceValue)} FCFA</td>
                <td>${formatNumber(packPriceValue)} FCFA</td>
              </tr>
              ${clientData.options.map(opt => {
                const option = availableOptions.find(o => o.name === opt);
                const optPrice = parsePrice(option?.price);
                return `
                <tr>
                  <td>Option : ${opt}<br/><small>${option?.type}</small></td>
                  <td>1</td>
                  <td>${formatNumber(optPrice)} FCFA</td>
                  <td>${formatNumber(optPrice)} FCFA</td>
                </tr>`;
              }).join('')}
              <tr style="background:#f5f5f5;"><td colspan="3" style="text-align:right;"><strong>Total HT</strong></td><td><strong>${formatNumber(totalHT)} FCFA</strong></td></tr>
              <tr style="background:#f5f5f5;"><td colspan="3" style="text-align:right;"><strong>TVA (18%)</strong></td><td><strong>${formatNumber(tva)} FCFA</strong></td></tr>
              <tr style="background:#e8f0fe;"><td colspan="3" style="text-align:right;"><strong>Total TTC</strong></td><td><strong class="price-highlight">${formatNumber(totalTTC)} FCFA</strong></td></tr>
            </tbody>
          </table>
          <div class="signature-section">
            <p><strong>Conditions de paiement :</strong> ${clientData.paymentMethod === 'virement' ? 'Virement bancaire' : clientData.paymentMethod === 'mobile_money' ? 'Mobile Money' : 'Prélèvement automatique'}</p>
            <div class="signature-line">
              <p>Signature client précédée de "Bon pour accord" :</p>
              <br/><br/>
              <p>_________________________</p>
            </div>
          </div>
          <div class="footer">
            <p>SIGEF APP - Solution SaaS pour la formation et la gestion académique</p>
          </div>
        `;

      case 'facture':
        return `
          <h1>FACTURE</h1>
          <h2>SIGEF APP - Plateforme SaaS</h2>
          <hr/>
          <p><strong>Facture N° :</strong> ${clientData.contractNumber.replace('SIGEF', 'FACT')}</p>
          <p><strong>Date d'émission :</strong> ${clientData.contractDate}</p>
          <p><strong>Date d'échéance :</strong> ${new Date(new Date(clientData.contractDate).setDate(new Date(clientData.contractDate).getDate() + 30)).toISOString().split('T')[0]}</p>
          <br/>
          <p><strong>Client :</strong> ${clientData.clientName}</p>
          <p><strong>Adresse :</strong> ${clientData.clientAddress || ''}</p>
          <p><strong>N° SIRET :</strong> ${clientData.clientSiret || 'Non renseigné'}</p>
          <br/>
          <h3>Description des prestations :</h3>
          <table>
            <thead><tr><th>Désignation</th><th>Montant</th></tr></thead>
            <tbody>
              <tr><td>Pack ${selectedPack?.name} - ${isYearly ? 'Abonnement annuel' : 'Abonnement mensuel'}<br/><small>Période du ${clientData.contractDate} au ${isYearly ? new Date(new Date(clientData.contractDate).setFullYear(new Date(clientData.contractDate).getFullYear() + 1)).toISOString().split('T')[0] : new Date(new Date(clientData.contractDate).setMonth(new Date(clientData.contractDate).getMonth() + 1)).toISOString().split('T')[0]}</small></td><td>${formatNumber(packPriceValue)} FCFA</td></tr>
              ${clientData.options.map(opt => {
                const option = availableOptions.find(o => o.name === opt);
                return `<tr><td>Option : ${opt} (${option?.type})</td><td>${formatNumber(parsePrice(option?.price))} FCFA</td></tr>`;
              }).join('')}
              <tr><td><strong>Total HT</strong></td><td><strong>${formatNumber(totalHT)} FCFA</strong></td></tr>
              <tr><td><strong>TVA (18%)</strong></td><td><strong>${formatNumber(tva)} FCFA</strong></td></tr>
              <tr><td><strong>Total TTC</strong></td><td><strong class="price-highlight">${formatNumber(totalTTC)} FCFA</strong></td></tr>
            </tbody>
          </table>
          <div class="signature-section">
            <p><strong>Référence de paiement :</strong> ${clientData.contractNumber}</p>
            <div style="display:flex; justify-content:space-between; margin-top:40px;">
              <div><p>SIGEF APP</p><p>Signature et cachet : _________________________</p></div>
              <div><p>Le Client</p><p>Signature et cachet : _________________________</p></div>
            </div>
          </div>
          <div class="footer">
            <p>Le présent document tient lieu de facture - SIGEF APP</p>
          </div>
        `;

      case 'contrat':
        return `
          <h1>CONTRAT D'ABONNEMENT SAAS</h1>
          <h2>SIGEF APP - Plateforme SaaS Multi-tenant</h2>
          <hr/>
          <p><strong>Contrat N° :</strong> ${clientData.contractNumber}</p>
          <p><strong>Date :</strong> ${clientData.contractDate}</p>
          <br/>
          <p><strong>Entre :</strong><br/>SIGEF APP SAS, dont le siège social est situé [Adresse], ci-après dénommé <strong>« le Prestataire »</strong></p>
          <p><strong>ET</strong></p>
          <p><strong>${clientData.clientName}</strong>, représenté par ${clientData.clientRepresentative || '_________________________'}, ci-après dénommé <strong>« le Client »</strong></p>
          <br/>
          <h3>Article 1 : Objet</h3>
          <p>Le présent contrat a pour objet la mise à disposition de la plateforme SIGEF APP en mode SaaS Multi-tenant.</p>
          <h3>Article 2 : Prestations incluses</h3>
          <p>Le Prestataire fournit :</p>
          <ul>
            <li>L'accès à la plateforme SIGEF APP</li>
            <li>L'hébergement sécurisé des données</li>
            <li>La maintenance corrective</li>
            <li>Les mises à jour de sécurité</li>
          </ul>
          <p><strong>Pack souscrit : ${selectedPack?.name}</strong></p>
          <ul>${selectedPack?.features.map(f => `<li>${f}</li>`).join('')}</ul>
          ${clientData.options.length > 0 ? `<p><strong>Options souscrites :</strong> ${clientData.options.join(', ')}</p>` : ''}
          <h3>Article 3 : Durée</h3>
          <p>Contrat conclu pour une durée de ${isYearly ? '12 mois' : '1 mois'} à compter du ${clientData.contractDate}.</p>
          <h3>Article 4 : Prix</h3>
          <p>Montant total TTC : ${formatNumber(totalTTC)} FCFA</p>
          <div class="signature-section">
            <div style="display:flex; justify-content:space-between; margin-top:50px;">
              <div><p>SIGEF APP</p><p>Signature : _________________________</p></div>
              <div><p>Le Client</p><p>Signature : _________________________</p></div>
            </div>
          </div>
        `;

      case 'decharge':
        return `
          <h1>DÉCHARGE DE RÉCEPTION</h1>
          <h2>SIGEF APP - Plateforme SaaS Multi-tenant</h2>
          <hr/>
          <p>Je soussigné(e),</p>
          <p><strong>Nom :</strong> ${clientData.clientRepresentative || '_________________________'}<br/>
          <strong>Fonction :</strong> Représentant légal<br/>
          <strong>Établissement :</strong> ${clientData.clientName}</p>
          <br/>
          <p>Reconnais avoir reçu de SIGEF APP :</p>
          <ul>
            <li>☐ Les accès administrateur à la plateforme</li>
            <li>☐ Les identifiants de connexion sécurisés</li>
            <li>☐ La documentation technique et utilisateur</li>
            <li>☐ La formation initiale</li>
            <li>☐ Les options complémentaires souscrites</li>
          </ul>
          <p><strong>Pack :</strong> ${selectedPack?.name}</p>
          <p><strong>Date de mise en service :</strong> ${clientData.contractDate}</p>
          <div class="signature-section">
            <p><strong>Fait à ${clientData.city || '_________________________'}, le ${clientData.contractDate}</strong></p>
            <div style="display:flex; justify-content:space-between; margin-top:50px;">
              <div><p>Le Client</p><p>Signature : _________________________</p></div>
              <div><p>SIGEF APP</p><p>Signature : _________________________</p></div>
            </div>
          </div>
        `;

      case 'attestation_mise_en_service':
        return `
          <h1>ATTESTATION DE MISE EN SERVICE</h1>
          <h2>SIGEF APP - Plateforme SaaS Multi-tenant</h2>
          <hr/>
          <p>Je soussigné(e), représentant la société <strong>SIGEF APP SAS</strong>, atteste que la plateforme a été mise en service pour <strong>${clientData.clientName}</strong> le <strong>${clientData.contractDate}</strong>.</p>
          <h3>Configuration technique réalisée :</h3>
          <ul>
            <li>☐ Installation et configuration de la base de données</li>
            <li>☐ Configuration des espaces administrateurs</li>
            <li>☐ Paramétrage des options souscrites</li>
            ${clientData.options.some(opt => opt === 'Domaine personnalisé') ? '<li>☐ Intégration du domaine personnalisé</li>' : ''}
            ${clientData.options.some(opt => opt === 'Hébergement Premium') ? '<li>☐ Configuration hébergement premium</li>' : ''}
            <li>☐ Tests de fonctionnement validés</li>
          </ul>
          <div class="signature-section">
            <div style="display:flex; justify-content:space-between; margin-top:50px;">
              <div><p>SIGEF APP</p><p>Signature : _________________________</p></div>
              <div><p>Le Client</p><p>Signature : _________________________</p></div>
            </div>
          </div>
        `;

      case 'pv_formation':
        return `
          <h1>PROCÈS-VERBAL DE FORMATION</h1>
          <h2>SIGEF APP - Plateforme SaaS Multi-tenant</h2>
          <hr/>
          <p><strong>Date :</strong> ${clientData.trainingDate || clientData.contractDate}</p>
          <p><strong>Durée :</strong> ${clientData.trainingDuration} heures</p>
          <p><strong>Formateur :</strong> ${clientData.trainerName || '_________________________'}</p>
          <p><strong>Client :</strong> ${clientData.clientName}</p>
          <br/>
          <h3>Participants :</h3>
          <table>
            <thead><tr><th>N°</th><th>Nom et prénom</th><th>Fonction</th><th>Signature</th></tr></thead>
            <tbody>
              ${clientData.participants.length > 0 ? clientData.participants.map((p, i) => `
                <tr><td>${i+1}</td><td>${p.name || '_________________'}</td><td>${p.function || '_________________'}</td><td>_______________</td></tr>
              `).join('') : '<tr><td colspan="4" style="text-align:center;">Aucun participant renseigné</td></tr>'}
            </tbody>
          </table>
          <div class="signature-section">
            <p><strong>Fait à ${clientData.city || '_________________________'}, le ${clientData.trainingDate || clientData.contractDate}</strong></p>
            <div style="display:flex; justify-content:space-between; margin-top:50px;">
              <div><p>Le Formateur</p><p>Signature : _________________________</p></div>
              <div><p>Le Responsable Client</p><p>Signature : _________________________</p></div>
            </div>
          </div>
        `;

      default:
        return `<div>Document non disponible</div>`;
    }
  };

  // ==================== DOCUMENTS REVENDEUR ====================
  const getResellerDocumentHTML = (type) => {
    const selectedOffer = resellerOffers[resellerData.resellerOffer];
    const offerPrice = parsePrice(selectedOffer?.price);
    const maintenancePrice = resellerData.wantsMaintenance ? 
      (resellerData.maintenancePack === 'essentiel' ? '300000' : '500000') : '0';

    switch(type) {
      case 'devis_revendeur':
        return `
          <h1>DEVIS REVENDEUR</h1>
          <h2>Programme Super Admin - SIGEF APP</h2>
          <hr/>
          <p><strong>Devis N° :</strong> ${resellerData.contractNumber}</p>
          <p><strong>Date :</strong> ${resellerData.contractDate}</p>
          <p><strong>Validité :</strong> 30 jours</p>
          <br/>
          <p><strong>Société :</strong> ${resellerData.companyName || '_________________________'}</p>
          <p><strong>Adresse :</strong> ${resellerData.companyAddress || '_________________________'}</p>
          <p><strong>Email :</strong> ${resellerData.companyEmail || '_________________________'}</p>
          <p><strong>Tél :</strong> ${resellerData.companyPhone || '_________________________'}</p>
          <p><strong>Représentant :</strong> ${resellerData.legalRepresentative || '_________________________'}</p>
          <p><strong>N° SIRET :</strong> ${resellerData.companySiret || 'Non renseigné'}</p>
          <br/>
          <h3>Offre souscrite :</h3>
          <table>
            <thead><tr><th>Désignation</th><th>Prix</th><th>Périodicité</th></tr></thead>
            <tbody>
              <tr>
                <td>${selectedOffer?.name}</td>
                <td>${formatNumber(offerPrice)} FCFA</td>
                <td>${selectedOffer?.period === 'définitif' ? 'Achat unique' : `Par ${selectedOffer?.period}`}</td>
              </tr>
            </tbody>
          </table>
          <h3>Packs à revendre (sous-administrateurs) :</h3>
          <table>
            <thead><tr><th>Pack</th><th>Mensuel</th><th>Annuel</th><th>Caractéristiques</th></tr></thead>
            <tbody>
              <tr><td>Starter</td><td>15 000 FCFA</td><td>150 000 FCFA</td><td>100 apprenants, 10 formateurs</td></tr>
              <tr><td>Business</td><td>35 000 FCFA</td><td>350 000 FCFA</td><td>1000 apprenants, formateurs illimités</td></tr>
              <tr><td>Premium</td><td>75 000 FCFA</td><td>750 000 FCFA</td><td>Apprenants illimités</td></tr>
            </tbody>
          </table>
          <div class="signature-section">
            <div class="signature-line">
              <p>Signature revendeur précédée de "Bon pour accord" :</p>
              <br/><br/>
              <p>_________________________</p>
            </div>
          </div>
          <div class="footer">
            <p>SIGEF APP - Programme Partenaire Revendeur</p>
          </div>
        `;

      case 'contrat_revendeur':
        return `
          <h1>CONTRAT DE PARTENARIAT REVENDEUR</h1>
          <h2>SIGEF APP - Programme Super Admin</h2>
          <hr/>
          <p><strong>Contrat N° :</strong> ${resellerData.contractNumber}</p>
          <p><strong>Date :</strong> ${resellerData.contractDate}</p>
          <br/>
          <p><strong>Entre les soussignés :</strong></p>
          <p>La société <strong>SIGEF APP SAS</strong>, dont le siège social est situé [Adresse], immatriculée sous le numéro [SIRET], représentée par [Gérant], ci-après dénommée <strong>« Le Concédant »</strong></p>
          <p><strong>ET</strong></p>
          <p>La société <strong>${resellerData.companyName || '_________________________'}</strong>, dont le siège social est situé ${resellerData.companyAddress || '[Adresse du revendeur]'}, immatriculée sous le numéro ${resellerData.companySiret || '[SIRET]'}, représentée par ${resellerData.legalRepresentative || '_________________________'}, ci-après dénommée <strong>« Le Partenaire Revendeur »</strong></p>
          <br/>
          
          <h3>Article 1 : Objet du contrat</h3>
          <p>Le Concédant accorde au Partenaire Revendeur une licence lui permettant de commercialiser la plateforme SaaS multi-tenant <strong>SIGEF APP</strong> sous sa propre marque (solution white label) auprès de ses clients.</p>
          
          <h3>Article 2 : Licence souscrite</h3>
          <p>${selectedOffer?.name} - ${formatNumber(offerPrice)} FCFA (${selectedOffer?.period === 'définitif' ? 'Achat définitif - Licence perpétuelle' : `par ${selectedOffer?.period}`})</p>
          
          <h3>Article 3 : Ce que nous offrons (Le Concédant)</h3>
          <ul>
            <li>Plateforme clé en main en marque blanche</li>
            <li>Accompagnement personnalisé et formation initiale</li>
            <li>Mises à jour régulières et correctifs de sécurité</li>
            <li>Support technique niveau 2 et 3</li>
          </ul>
          
          <h3>Article 4 : Ce que vous apportez (Le Partenaire Revendeur)</h3>
          <ul>
            <li>Commercialisation de la plateforme</li>
            <li>Gestion de la relation client</li>
            <li>Support niveau 1</li>
            <li>Conformité locale</li>
          </ul>
          
          <div class="page-break"></div>
          
          <h3>Article 5 : Responsabilités et engagement du Revendeur</h3>
          <p><strong>5.1. Responsabilité exclusive du Revendeur</strong></p>
          <p>Le Partenaire Revendeur reconnaît et accepte que <strong>l'ensemble des responsabilités liées à l'exploitation du SaaS</strong> (plateforme SIGEF APP) <strong>repose entièrement sur lui</strong>. À ce titre, le Revendeur est seul responsable :</p>
          <ul>
            <li>De la commercialisation et de la gestion des contrats avec ses clients finaux</li>
            <li>De la conformité de son activité avec les lois et règlements applicables (protection des données, fiscalité, RGPD, etc.)</li>
            <li>De la qualité du support fourni à ses clients (niveau 1)</li>
            <li>Des relations commerciales et contractuelles avec ses propres clients</li>
            <li>De la tarification appliquée à ses clients finaux</li>
            <li>De la gestion des réclamations et litiges avec ses clients</li>
          </ul>
          
          <p><strong>5.2. Engagement d'acquisition</strong></p>
          <p>Le Partenaire Revendeur déclare avoir pris <strong>l'engagement libre et éclairé d'acquérir ce SaaS</strong>. Il reconnaît avoir :</p>
          <ul>
            <li>Étudié attentivement les caractéristiques techniques et fonctionnelles de la plateforme</li>
            <li>Compris le modèle économique et les obligations liées à cette licence</li>
            <li>Accepté les conditions générales d'utilisation</li>
            <li>Pris connaissance des responsabilités qui lui incombent</li>
            <li>Accepté que le Concédant ne peut être tenu responsable des actes du Revendeur</li>
          </ul>
          
          <p><strong>5.3. Clause de non-responsabilité du Concédant</strong></p>
          <p>Le Concédant ne saurait être tenu responsable des conséquences directes ou indirectes liées à :</p>
          <ul>
            <li>L'utilisation de la plateforme par les clients du Revendeur</li>
            <li>La non-conformité de l'activité du Revendeur avec les lois locales</li>
            <li>Les engagements commerciaux pris par le Revendeur envers ses clients</li>
            <li>Les modifications apportées à la plateforme par le Revendeur</li>
          </ul>
          
          <h3>Article 6 : Maintenance offerte</h3>
          <p><strong>6.1. Période de maintenance offerte</strong></p>
          <p>Le Concédant offre une période de maintenance gratuite de <strong>trois (3) mois</strong> à compter de la date de mise en service de la plateforme. Pendant cette période, sont inclus gratuitement :</p>
          <ul>
            <li>La maintenance corrective (correction des bugs)</li>
            <li>Les mises à jour de sécurité</li>
            <li>Le support technique niveau 2 et 3</li>
          </ul>
          
          <p><strong>6.2. Maintenance après la période offerte</strong></p>
          <p>Passé le délai de 3 mois, toute intervention de maintenance (correction de bugs, mise à jour, support avancé) fera l'objet d'une <strong>facturation spécifique</strong>. Un devis sera établi avant toute intervention.</p>
          
          <div class="page-break"></div>
          
          <h3>Article 7 : Évolutions et développement sur-mesure</h3>
          <p><strong>7.1. Atelier de conception</strong></p>
          <p>Si le Partenaire Revendeur souhaite ajouter de nouvelles fonctionnalités ou faire évoluer la plateforme, la collaboration débutera par <strong>un atelier d'élaboration du cahier des charges</strong> au tarif de :</p>
          <ul>
            <li><strong>50 000 FCFA par jour</strong> (forfait journalier)</li>
            <li>Durée estimée de l'atelier : 1 à 3 jours selon la complexité</li>
            <li>L'atelier permettra de définir précisément les spécifications techniques</li>
          </ul>
          
          <p><strong>7.2. Développement des nouvelles fonctionnalités</strong></p>
          <p>Après validation du cahier des charges, le développement des fonctionnalités sera facturé :</p>
          <ul>
            <li><strong>300 000 FCFA minimum</strong> par projet (forfait de base)</li>
            <li>Tarif au-delà : <strong>35 000 FCFA/heure</strong> pour les développements complexes</li>
            <li>Un devis détaillé sera fourni avant tout début de développement</li>
            <li>Délai de livraison : à définir selon l'ampleur du projet</li>
          </ul>
          
          <p><strong>7.3. Processus complet d'évolution</strong></p>
          <ol>
            <li><strong>Étape 1 :</strong> Atelier cahier des charges (50 000 FCFA/jour)</li>
            <li><strong>Étape 2 :</strong> Établissement du devis de développement</li>
            <li><strong>Étape 3 :</strong> Validation et acompte (50%)</li>
            <li><strong>Étape 4 :</strong> Développement et tests</li>
            <li><strong>Étape 5 :</strong> Recette et validation par le Revendeur</li>
            <li><strong>Étape 6 :</strong> Mise en production et solde (50%)</li>
          </ol>
          
          <p><strong>Exemple de devis pour évolution :</strong></p>
          <ul>
            <li>Atelier cahier des charges (2 jours) : 100 000 FCFA</li>
            <li>Développement (estimation) : 300 000 à 1 500 000 FCFA selon complexité</li>
            <li>Total estimé : 400 000 à 1 600 000 FCFA HT</li>
          </ul>
          
          <h3>Article 8 : Packs à revendre (sous-administrateurs)</h3>
          <table>
            <thead><tr><th>Pack</th><th>Mensuel</th><th>Annuel</th><th>Caractéristiques</th></tr></thead>
            <tbody>
              <tr><td>Starter</small><td>15 000 FCFA</small><td>150 000 FCFA</small><td>100 apprenants, 10 formateurs</small></tr>
              <tr><td>Business</small><td>35 000 FCFA</small><td>350 000 FCFA</small><td>1000 apprenants, formateurs illimités</small></tr>
              <tr><td>Premium</small><td>75 000 FCFA</small><td>750 000 FCFA</small><td>Apprenants illimités</small></tr>
            </tbody>
          </table>
          
          <div class="page-break"></div>
          
          <h3>Article 9 : Durée et résiliation</h3>
          <p>Contrat conclu pour une durée de ${resellerData.resellerOffer === 'annuel' ? '12 mois' : resellerData.resellerOffer === 'mensuel' ? '1 mois' : 'perpétuelle'}.</p>
          <p>Chaque partie peut résilier le contrat par simple notification écrite avec un préavis de <strong>30 jours</strong>, sans motif, ni pénalité.</p>
          
          <h3>Article 10 : Assurance recommandée</h3>
          <p>Il est vivement recommandé au Partenaire Revendeur de souscrire une <strong>assurance responsabilité civile professionnelle</strong> adaptée à son activité de revendeur de solutions SaaS.</p>
          
          <div class="signature-section">
            <p><strong>Fait en deux exemplaires originaux, à ${resellerData.city || '_________________________'}, le ${resellerData.contractDate}</strong></p>
            <br/>
            <div style="display:flex; justify-content:space-between; margin-top:40px;">
              <div style="width:45%">
                <p><strong>SIGEF APP SAS (Le Concédant)</strong></p>
                <p>Signature :</p>
                <br/><br/><br/>
                <p>_________________________</p>
                <p>Cachet et signature</p>
              </div>
              <div style="width:45%">
                <p><strong>${resellerData.companyName || 'Le Partenaire Revendeur'}</strong></p>
                <p>Signature précédée de la mention <strong>"Lu et approuvé, avec engagement d'acquisition"</strong> :</p>
                <br/><br/><br/>
                <p>_________________________</p>
                <p>Cachet et signature</p>
              </div>
            </div>
            <div style="margin-top: 30px; text-align: center; background-color: #e8f5e9; padding: 15px;">
              <p style="color: #2e7d32;">🤝 PARTENARIAT GAGNANT-GAGNANT - SIGEF APP</p>
              <p style="font-size: 11px; margin-top: 10px;">Le Revendeur reconnaît avoir pris l'engagement d'acquérir ce SaaS et accepte l'entière responsabilité de son exploitation</p>
            </div>
          </div>
        `;

      case 'facture_maintenance':
        return `
          <h1>FACTURE DE MAINTENANCE</h1>
          <h2>SIGEF APP - Support et Maintenance SaaS</h2>
          <hr/>
          <p><strong>Facture N° :</strong> MAINT-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}</p>
          <p><strong>Date d'émission :</strong> ${new Date().toISOString().split('T')[0]}</p>
          <p><strong>Date d'échéance :</strong> ${new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0]}</p>
          <br/>
          <p><strong>Client :</strong> ${resellerData.companyName || '_________________________'}</p>
          <p><strong>Adresse :</strong> ${resellerData.companyAddress || ''}</p>
          <p><strong>N° SIRET :</strong> ${resellerData.companySiret || 'Non renseigné'}</p>
          <br/>
          <h3>Objet : Maintenance post-période offerte</h3>
          <p>La période de maintenance gratuite de 12 mois étant expirée, la présente facture concerne les services de maintenance pour la période à venir.</p>
          <br/>
          <h3>Détail des prestations :</h3>
          <tr>
            <thead><tr><th>Désignation</th><th>Montant</th></tr></thead>
            <tbody>
              <tr>
                <td><strong>Maintenance SaaS - ${resellerData.maintenancePack === 'essentiel' ? 'Pack Essentiel' : 'Pack Premium'}</strong><br/>
                <small>${resellerData.maintenancePack === 'essentiel' ? 'Mises à jour sécurité + Support technique' : 'Mises à jour sécurité + Support technique + Évolutions mineures'}</small></td>
                <td>${formatNumber(parseInt(maintenancePrice))} FCFA/an</small></td>
              </tr>
            </tbody>
          </table>
          <div class="signature-section">
            <p><strong>Référence de paiement :</strong> MAINT-${new Date().getFullYear()}</p>
            <div style="display:flex; justify-content:space-between; margin-top:40px;">
              <div><p>SIGEF APP</p><p>Signature et cachet : _________________________</p></div>
              <div><p>Le Client</p><p>Signature et cachet : _________________________</p></div>
            </div>
          </div>
          <div class="footer">
            <p>Cette facture concerne la maintenance annuelle - Période de validité : 12 mois</p>
            <p>Pour toute évolution ou développement sur-mesure, merci de nous contacter pour un devis personnalisé.</p>
          </div>
        `;

      default:
        return `<div>Document non disponible</div>`;
    }
  };

  // Liste des documents CLIENT
  const clientDocuments = [
    { id: 'devis', name: 'Devis commercial', icon: FileText, description: 'Devis commercial détaillé avec tous les tarifs' },
    { id: 'facture', name: 'Facture', icon: Receipt, description: 'Facture acquittée avec détails des prestations' },
    { id: 'contrat', name: "Contrat d'abonnement", icon: FileSignature, description: "Contrat d'abonnement SaaS complet" },
    { id: 'decharge', name: 'Décharge de réception', icon: FileCheck, description: 'Décharge après installation et réception' },
    { id: 'attestation_mise_en_service', name: 'Attestation de mise en service', icon: Crown, description: "Attestation d'installation et configuration" },
    { id: 'pv_formation', name: 'PV de formation', icon: GraduationCap, description: 'Procès-verbal de formation des utilisateurs' },
  ];

  // Liste des documents REVENDEUR
  const resellerDocuments = [
    { id: 'devis_revendeur', name: 'Devis Revendeur', icon: Handshake, description: 'Devis pour licence Super Admin avec grille tarifaire' },
    { id: 'contrat_revendeur', name: 'Contrat Revendeur', icon: FileSignature, description: 'Contrat partenaire Super Admin avec responsabilités et évolutions' },
    { id: 'facture_maintenance', name: 'Facture Maintenance', icon: Receipt, description: 'Facture pour maintenance après période offerte (3 mois)' },
  ];

  return (
    <div className="space-y-6">
      {/* Switch Client / Revendeur */}
      <div className="flex gap-4 bg-gray-900 p-2 rounded-lg w-fit">
        <Button 
          onClick={() => setActiveMainTab('client')}
          className={`gap-2 ${activeMainTab === 'client' ? 'bg-primary' : 'bg-gray-800'}`}
        >
          <Building2 className="h-4 w-4" /> Client
        </Button>
        <Button 
          onClick={() => setActiveMainTab('reseller')}
          className={`gap-2 ${activeMainTab === 'reseller' ? 'bg-primary' : 'bg-gray-800'}`}
        >
          <UserCog className="h-4 w-4" /> Revendeur / Super Admin
        </Button>
      </div>

      {/* ==================== SECTION CLIENT ==================== */}
      {activeMainTab === 'client' && (
        <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-6 bg-gray-800">
            <TabsTrigger value="info" className="data-[state=active]:bg-primary">Informations client</TabsTrigger>
            <TabsTrigger value="documents" className="data-[state=active]:bg-primary">Documents client</TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Informations client
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label className="text-gray-300">Raison sociale *</Label><Input name="clientName" value={clientData.clientName} onChange={handleClientInputChange} className="bg-gray-800 border-gray-700 text-white" placeholder="Nom de l'entreprise" /></div>
                  <div><Label className="text-gray-300">Représentant légal</Label><Input name="clientRepresentative" value={clientData.clientRepresentative} onChange={handleClientInputChange} className="bg-gray-800 border-gray-700 text-white" placeholder="Nom du représentant" /></div>
                </div>
                <div><Label className="text-gray-300">Adresse</Label><Input name="clientAddress" value={clientData.clientAddress} onChange={handleClientInputChange} className="bg-gray-800 border-gray-700 text-white" placeholder="Adresse complète" /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label className="text-gray-300">Email</Label><Input name="clientEmail" value={clientData.clientEmail} onChange={handleClientInputChange} className="bg-gray-800 border-gray-700 text-white" /></div>
                  <div><Label className="text-gray-300">Téléphone</Label><Input name="clientPhone" value={clientData.clientPhone} onChange={handleClientInputChange} className="bg-gray-800 border-gray-700 text-white" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label className="text-gray-300">N° SIRET</Label><Input name="clientSiret" value={clientData.clientSiret} onChange={handleClientInputChange} className="bg-gray-800 border-gray-700 text-white" placeholder="Numéro SIRET" /></div>
                  <div><Label className="text-gray-300">Ville</Label><Input name="city" value={clientData.city} onChange={handleClientInputChange} className="bg-gray-800 border-gray-700 text-white" placeholder="Ville de signature" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label className="text-gray-300">Date du contrat</Label><Input name="contractDate" type="date" value={clientData.contractDate} onChange={handleClientInputChange} className="bg-gray-800 border-gray-700 text-white" /></div>
                  <div><Label className="text-gray-300">Numéro de contrat</Label><Input name="contractNumber" value={clientData.contractNumber} onChange={handleClientInputChange} className="bg-gray-800 border-gray-700 text-white" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label className="text-gray-300">Pack sélectionné</Label>
                    <select name="packName" value={clientData.packName} onChange={handleClientInputChange} className="w-full bg-gray-800 border-gray-700 text-white rounded-md p-2">
                      {clientPacks.map(pack => (<option key={pack.name} value={pack.name}>{pack.name} - {formatNumber(parseInt(pack.price))} FCFA/mois ou {formatNumber(parseInt(pack.yearlyPrice))} FCFA/an</option>))}
                    </select>
                  </div>
                  <div><Label className="text-gray-300">Période d'abonnement</Label>
                    <select name="packPeriod" value={clientData.packPeriod} onChange={handleClientInputChange} className="w-full bg-gray-800 border-gray-700 text-white rounded-md p-2">
                      <option value="mensuel">Mensuel</option>
                      <option value="annuel">Annuel (économie 2 mois)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-300">Options supplémentaires</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    {availableOptions.map(opt => (
                      <label key={opt.name} className="flex items-center gap-2 text-gray-300">
                        <input type="checkbox" checked={clientData.options.includes(opt.name)} onChange={() => handleClientOptionToggle(opt)} className="rounded border-gray-700 bg-gray-800" />
                        {opt.name} ({formatNumber(parseInt(opt.price))} FCFA - {opt.type})
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-gray-300">Mode de paiement</Label>
                  <select name="paymentMethod" value={clientData.paymentMethod} onChange={handleClientInputChange} className="w-full bg-gray-800 border-gray-700 text-white rounded-md p-2 mt-2">
                    <option value="virement">Virement bancaire</option>
                    <option value="cb">Carte bancaire</option>
                    <option value="prelevement">Prélèvement automatique</option>
                    <option value="mobile_money">Mobile Money</option>
                  </select>
                </div>
                <div className="border-t border-gray-800 pt-4 mt-4">
                  <Label className="text-gray-300 flex items-center gap-2 mb-3">📚 Informations formation</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label className="text-gray-300">Date de formation</Label><Input name="trainingDate" type="date" value={clientData.trainingDate} onChange={handleClientInputChange} className="bg-gray-800 border-gray-700 text-white" /></div>
                    <div><Label className="text-gray-300">Durée (heures)</Label><Input name="trainingDuration" value={clientData.trainingDuration} onChange={handleClientInputChange} className="bg-gray-800 border-gray-700 text-white" /></div>
                  </div>
                  <div className="mt-3"><Label className="text-gray-300">Nom du formateur</Label><Input name="trainerName" value={clientData.trainerName} onChange={handleClientInputChange} className="bg-gray-800 border-gray-700 text-white" placeholder="Nom du formateur" /></div>
                  <div className="mt-3">
                    <Label className="text-gray-300">Participants à la formation</Label>
                    {clientData.participants.map((p, idx) => (
                      <div key={idx} className="grid grid-cols-2 gap-2 mt-2">
                        <Input placeholder="Nom et prénom" value={p.name} onChange={(e) => updateParticipant(idx, 'name', e.target.value)} className="bg-gray-800 border-gray-700 text-white text-sm" />
                        <Input placeholder="Fonction" value={p.function} onChange={(e) => updateParticipant(idx, 'function', e.target.value)} className="bg-gray-800 border-gray-700 text-white text-sm" />
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={addParticipant} className="mt-2 border-gray-700 text-gray-300">+ Ajouter un participant</Button>
                  </div>
                </div>
                <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                  <p className="text-gray-200 text-sm">📊 <strong>Récapitulatif :</strong></p>
                  <p className="text-gray-300 text-sm mt-2">Pack {clientData.packName} : {formatNumber(calculateClientTotal() - clientData.options.reduce((sum, opt) => sum + parsePrice(availableOptions.find(o => o.name === opt)?.price), 0))} FCFA / {clientData.packPeriod === 'annuel' ? 'an' : 'mois'}</p>
                  <p className="text-gray-300 text-sm">Options : {clientData.options.length > 0 ? clientData.options.join(', ') : 'Aucune'}</p>
                  <p className="text-gray-300 text-sm">Total HT : {formatNumber(calculateClientTotal())} FCFA</p>
                  <p className="text-gray-300 text-sm">TVA (18%) : {formatNumber(getClientTVA())} FCFA</p>
                  <p className="text-primary font-bold text-base mt-2">Total TTC : {formatNumber(getClientTotalTTC())} FCFA</p>
                </div>
                <Button onClick={() => setActiveSubTab('documents')} className="w-full bg-gradient-to-r from-primary to-secondary">Continuer vers les documents <ChevronRight className="ml-2 h-4 w-4" /></Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {clientDocuments.map((doc) => {
                const Icon = doc.icon;
                return (
                  <Card key={doc.id} className="bg-gray-900 border-gray-800 hover:border-primary/50 transition-all">
                    <CardHeader><CardTitle className="text-white flex items-center gap-2"><Icon className="h-5 w-5 text-primary" />{doc.name}</CardTitle></CardHeader>
                    <CardContent>
                      <p className="text-gray-400 text-sm mb-4">{doc.description}</p>
                      <div className="flex gap-3">
                        <Button onClick={() => generatePDF(doc.id, doc.name, false)} className="flex-1 bg-primary hover:bg-primary/90"><Download className="h-4 w-4 mr-2" />PDF</Button>
                        <Button onClick={() => printDocument(doc.id, doc.name, false)} variant="outline" className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"><Printer className="h-4 w-4 mr-2" />Imprimer</Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* ==================== SECTION REVENDEUR ==================== */}
      {activeMainTab === 'reseller' && (
        <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-6 bg-gray-800">
            <TabsTrigger value="info" className="data-[state=active]:bg-primary">Informations revendeur</TabsTrigger>
            <TabsTrigger value="documents" className="data-[state=active]:bg-primary">Documents revendeur</TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <UserCog className="h-5 w-5 text-primary" />
                  Informations Revendeur / Super Admin
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label className="text-gray-300">Raison sociale *</Label><Input name="companyName" value={resellerData.companyName} onChange={handleResellerInputChange} className="bg-gray-800 border-gray-700 text-white" placeholder="Nom de l'entreprise" /></div>
                  <div><Label className="text-gray-300">Représentant légal</Label><Input name="legalRepresentative" value={resellerData.legalRepresentative} onChange={handleResellerInputChange} className="bg-gray-800 border-gray-700 text-white" placeholder="Nom du représentant" /></div>
                </div>
                <div><Label className="text-gray-300">Adresse</Label><Input name="companyAddress" value={resellerData.companyAddress} onChange={handleResellerInputChange} className="bg-gray-800 border-gray-700 text-white" placeholder="Adresse complète" /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label className="text-gray-300">Email</Label><Input name="companyEmail" value={resellerData.companyEmail} onChange={handleResellerInputChange} className="bg-gray-800 border-gray-700 text-white" /></div>
                  <div><Label className="text-gray-300">Téléphone</Label><Input name="companyPhone" value={resellerData.companyPhone} onChange={handleResellerInputChange} className="bg-gray-800 border-gray-700 text-white" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label className="text-gray-300">N° SIRET</Label><Input name="companySiret" value={resellerData.companySiret} onChange={handleResellerInputChange} className="bg-gray-800 border-gray-700 text-white" placeholder="Numéro SIRET" /></div>
                  <div><Label className="text-gray-300">Ville signature</Label><Input name="city" value={resellerData.city} onChange={handleResellerInputChange} className="bg-gray-800 border-gray-700 text-white" placeholder="Ville de signature" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label className="text-gray-300">Date du contrat</Label><Input name="contractDate" type="date" value={resellerData.contractDate} onChange={handleResellerInputChange} className="bg-gray-800 border-gray-700 text-white" /></div>
                  <div><Label className="text-gray-300">Numéro de contrat</Label><Input name="contractNumber" value={resellerData.contractNumber} onChange={handleResellerInputChange} className="bg-gray-800 border-gray-700 text-white" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label className="text-gray-300">Offre Revendeur</Label>
                    <select name="resellerOffer" value={resellerData.resellerOffer} onChange={handleResellerInputChange} className="w-full bg-gray-800 border-gray-700 text-white rounded-md p-2">
                      <option value="mensuel">Mensuel - 120 000 FCFA/mois</option>
                      <option value="annuel">Annuel - 1 200 000 FCFA/an (Économie 2 mois)</option>
                      <option value="lifetime">Licence Complète - 5 500 000 FCFA (Achat définitif)</option>
                    </select>
                  </div>
                  {/* <div><Label className="text-gray-300">Taux de commission (%)</Label>
                    <Input name="commissionRate" value={resellerData.commissionRate} onChange={handleResellerInputChange} className="bg-gray-800 border-gray-700 text-white" type="number" placeholder="20" />
                  </div> */}
                </div>
                <div>
                  <Label className="text-gray-300">Packs à revendre</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <label className="flex items-center gap-2 text-gray-300"><input type="checkbox" checked={resellerData.subPacks.includes('Starter')} onChange={() => handleSubPackToggle('Starter')} /> Starter</label>
                    <label className="flex items-center gap-2 text-gray-300"><input type="checkbox" checked={resellerData.subPacks.includes('Business')} onChange={() => handleSubPackToggle('Business')} /> Business</label>
                    <label className="flex items-center gap-2 text-gray-300"><input type="checkbox" checked={resellerData.subPacks.includes('Premium')} onChange={() => handleSubPackToggle('Premium')} /> Premium</label>
                  </div>
                </div>

                {/* Section Maintenance après période offerte */}
                <div className="border-t border-primary/30 pt-4 mt-4">
                  <Label className="text-white flex items-center gap-2 mb-3">
                    <Wrench className="h-5 w-5 text-primary" />
                    🛠️ Maintenance (après période offerte)
                  </Label>
                  <div className="bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/30 mb-3">
                    <p className="text-yellow-400 text-sm">ℹ️ Période de maintenance offerte : 3 mois après la mise en service</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">Souhaitez-vous un contrat de maintenance ?</Label>
                      <div className="flex gap-4 mt-2">
                        <label className="flex items-center gap-2 text-gray-300">
                          <input type="radio" name="wantsMaintenance" value="true" checked={resellerData.wantsMaintenance === true} onChange={() => setResellerData({...resellerData, wantsMaintenance: true})} /> Oui
                        </label>
                        <label className="flex items-center gap-2 text-gray-300">
                          <input type="radio" name="wantsMaintenance" value="false" checked={resellerData.wantsMaintenance === false} onChange={() => setResellerData({...resellerData, wantsMaintenance: false})} /> Non
                        </label>
                      </div>
                    </div>
                    {resellerData.wantsMaintenance && (
                      <div>
                        <Label className="text-gray-300">Pack de maintenance</Label>
                        <select name="maintenancePack" value={resellerData.maintenancePack} onChange={handleResellerInputChange} className="w-full bg-gray-800 border-gray-700 text-white rounded-md p-2 mt-2">
                          <option value="essentiel">Pack Essentiel - 300 000 FCFA/an (MàJ sécurité + Support)</option>
                          <option value="premium">Pack Premium - 500 000 FCFA/an (Tout inclus + Évolutions mineures)</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                  <p className="text-gray-200 text-sm">📊 <strong>Récapitulatif :</strong></p>
                  <p className="text-primary font-bold text-base mt-2">Montant licence : {formatNumber(getResellerPrice())} FCFA</p>
                  <p className="text-gray-300 text-sm mt-2">Période : {resellerData.resellerOffer === 'mensuel' ? 'Mensuel' : resellerData.resellerOffer === 'annuel' ? 'Annuel' : 'Achat définitif'}</p>
                  {/* <p className="text-gray-300 text-sm">Commission : {resellerData.commissionRate}% sur les ventes</p> */}
                  {resellerData.wantsMaintenance && (
                    <p className="text-gray-300 text-sm">Maintenance : {resellerData.maintenancePack === 'essentiel' ? 'Pack Essentiel (300 000 FCFA/an)' : 'Pack Premium (500 000 FCFA/an)'}</p>
                  )}
                </div>
                <Button onClick={() => setActiveSubTab('documents')} className="w-full bg-gradient-to-r from-primary to-secondary">Continuer vers les documents <ChevronRight className="ml-2 h-4 w-4" /></Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {resellerDocuments.map((doc) => {
                const Icon = doc.icon;
                return (
                  <Card key={doc.id} className="bg-gray-900 border-gray-800 hover:border-primary/50 transition-all">
                    <CardHeader><CardTitle className="text-white flex items-center gap-2"><Icon className="h-5 w-5 text-primary" />{doc.name}</CardTitle></CardHeader>
                    <CardContent>
                      <p className="text-gray-400 text-sm mb-4">{doc.description}</p>
                      <div className="flex gap-3">
                        <Button onClick={() => generatePDF(doc.id, doc.name, true)} className="flex-1 bg-primary hover:bg-primary/90"><Download className="h-4 w-4 mr-2" />PDF</Button>
                        <Button onClick={() => printDocument(doc.id, doc.name, true)} variant="outline" className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"><Printer className="h-4 w-4 mr-2" />Imprimer</Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default DocumentGenerator;