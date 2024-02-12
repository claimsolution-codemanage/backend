import ejs from 'ejs';

import htmlPdf from 'html-pdf';

export async function invoiceHtmlToPdfBuffer(pathname, params) {
  const html = await ejs.renderFile(pathname, {params:params});
  // return html
  return new Promise((resolve, reject) => {
    htmlPdf.create(html).toBuffer((err, buffer) => {
      if (err) {
        reject(err);
      } else {
        resolve(buffer);
      }
    });
  });
}