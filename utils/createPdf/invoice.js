import ejs from 'ejs';
import html_to_pdf from 'html-pdf-node'

export async function invoiceHtmlToPdfBuffer(pathname, params) {
  let options = {format:'A4',margin:{top:'5mm',bottom:'5mm',left:'5mm',right:'5mm'}}
  const html = await ejs.renderFile(pathname, {params:params});
  const file ={content:html}
  // return html
  return new Promise((resolve, reject) => {
    html_to_pdf.generatePdf(file,options).then(pdfBuffer=>{
      resolve(pdfBuffer)
    }).catch(err=>reject(err))

    // htmlPdf.create(html).toBuffer((err, buffer) => {
    //   if (err) {
    //     reject(err);
    //   } else {
    //     resolve(buffer);
    //   }
    // });
  });
}