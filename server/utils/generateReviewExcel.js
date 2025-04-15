const PDFDocument = require('pdfkit');

const generateReviewPDF = (review) => {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });

    doc.fontSize(18).text('Vehicle Review Report', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Vehicle: ${review.vehicleId?.name || 'Unnamed'}`);
    doc.text(`Employee: ${review.employeeId?.name || 'Unknown'}`);
    doc.text(`Date Reviewed: ${new Date(review.dateReviewed).toLocaleDateString()}`);
    doc.text(`WOF/Rego: ${review.wofRego || 'N/A'}`);
    doc.text(`Oil Checked: ${review.oilChecked ? 'Yes' : 'No'}`);
    doc.text(`Vehicle Checked: ${review.vehicleChecked ? 'Yes' : 'No'}`);
    doc.text(`Vehicle Broken: ${review.vehicleBroken ? 'Yes' : 'No'}`);
    doc.text(`Hours Used: ${review.hours || '--'}`);
    doc.text(`Notes: ${review.notes || 'N/A'}`);

    doc.end();
  });
};

module.exports = generateReviewPDF;
