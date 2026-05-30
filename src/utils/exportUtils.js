// src/utils/exportUtils.js
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Exporte les données vers un fichier Excel
 * @param {Array} data - Les données à exporter
 * @param {string} filename - Nom du fichier
 * @param {Array} columns - Configuration des colonnes [{header: 'Titre', accessor: 'cle', width: 20}]
 */
export const exportToExcel = (data, filename, columns) => {
  try {
    // Formater les données pour Excel
    const formattedData = data.map(row => {
      const newRow = {};
      columns.forEach(col => {
        let value = row[col.accessor];
        
        // Formater les dates
        if (col.type === 'date' && value) {
          value = new Date(value).toLocaleDateString('fr-FR');
        }
        
        // Formater les montants
        if (col.type === 'currency' && value) {
          value = `${value.toLocaleString()} FCFA`;
        }
        
        newRow[col.header] = value || '-';
      });
      return newRow;
    });
    
    // Créer le workbook et la worksheet
    const ws = XLSX.utils.json_to_sheet(formattedData);
    
    // Ajuster la largeur des colonnes
    const colWidths = {};
    columns.forEach(col => {
      colWidths[col.header] = { wch: col.width || 20 };
    });
    ws['!cols'] = columns.map(col => ({ wch: col.width || 20 }));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Utilisateurs');
    
    // Exporter le fichier
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    return true;
  } catch (error) {
    console.error('Erreur export Excel:', error);
    throw error;
  }
};

/**
 * Exporte les données vers un fichier PDF
 * @param {Array} data - Les données à exporter
 * @param {string} title - Titre du document
 * @param {Array} columns - Configuration des colonnes [{header: 'Titre', dataKey: 'cle'}]
 * @param {Object} options - Options supplémentaires
 */
export const exportToPDF = (data, title, columns, options = {}) => {
  try {
    // Créer le document PDF
    const doc = new jsPDF({
      orientation: options.orientation || 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    // Ajouter l'en-tête
    doc.setFontSize(18);
    doc.setTextColor(33, 37, 41);
    doc.text(title, 14, 22);
    
    // Ajouter la date d'export
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Exporté le ${new Date().toLocaleString('fr-FR')}`, 14, 30);
    
    // Préparer les données pour le tableau
    const tableData = data.map(row => {
      return columns.map(col => {
        let value = row[col.dataKey];
        
        // Formater les dates
        if (col.type === 'date' && value) {
          value = new Date(value).toLocaleDateString('fr-FR');
        }
        
        // Formater les montants
        if (col.type === 'currency' && value) {
          value = `${value.toLocaleString()} FCFA`;
        }
        
        return value || '-';
      });
    });
    
    const headers = [columns.map(col => col.header)];
    
    // Ajouter le tableau
    doc.autoTable({
      head: headers,
      body: tableData,
      startY: 35,
      theme: 'striped',
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 3
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240]
      },
      margin: { top: 35, left: 14, right: 14, bottom: 20 },
      didDrawPage: (data) => {
        // Ajouter un pied de page
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${data.pageNumber} sur ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }
    });
    
    // Sauvegarder le PDF
    doc.save(`${title.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    
    return true;
  } catch (error) {
    console.error('Erreur export PDF:', error);
    throw error;
  }
};

/**
 * Exporte les statistiques vers PDF
 */
export const exportStatsToPDF = (stats, title, additionalData = {}) => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // En-tête
    doc.setFontSize(20);
    doc.setTextColor(33, 37, 41);
    doc.text(title, 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Exporté le ${new Date().toLocaleString('fr-FR')}`, 14, 30);
    
    let yPos = 40;
    
    // Cartes de statistiques
    const statCards = [
      { label: 'Total Utilisateurs', value: stats.totalUsers, color: [41, 128, 185] },
      { label: 'Apprenants', value: stats.totalApprenants, color: [46, 204, 113] },
      { label: 'Formateurs', value: stats.totalFormateurs, color: [155, 89, 182] },
      { label: 'PRO Actifs', value: stats.activePro, color: [241, 196, 15] },
      { label: 'Abonnements actifs', value: stats.activeSubscriptions, color: [52, 152, 219] },
      { label: 'Chiffre d\'affaires', value: `${stats.totalRevenue?.toLocaleString()} FCFA`, color: [231, 76, 60] }
    ];
    
    // Afficher les cartes sur 2 lignes de 3
    statCards.forEach((card, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = 14 + (col * 65);
      const y = yPos + (row * 35);
      
      doc.setFillColor(...card.color);
      doc.setDrawColor(...card.color);
      doc.roundedRect(x, y, 58, 28, 3, 3, 'F');
      
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(card.label, x + 4, y + 10);
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(card.value.toString(), x + 4, y + 23);
      doc.setFont('helvetica', 'normal');
    });
    
    yPos += 70;
    
    // Données supplémentaires (ex: répartition par cycle)
    if (additionalData.cyclesData && additionalData.cyclesData.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(33, 37, 41);
      doc.text('Répartition par cycle', 14, yPos);
      yPos += 10;
      
      const cycleTableData = additionalData.cyclesData.map(cycle => [
        cycle.name,
        cycle.value.toString()
      ]);
      
      doc.autoTable({
        startY: yPos,
        head: [['Cycle', 'Nombre d\'utilisateurs']],
        body: cycleTableData,
        theme: 'striped',
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: [255, 255, 255]
        }
      });
      
      yPos = doc.lastAutoTable.finalY + 15;
    }
    
    // Pied de page
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} sur ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
    
    doc.save(`${title.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    
    return true;
  } catch (error) {
    console.error('Erreur export stats PDF:', error);
    throw error;
  }
};