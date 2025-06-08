import dotenv from "dotenv";
dotenv.config();
import firebaseAdmin from 'firebase-admin';

export const serviceAccount = {
  type: process.env.FIREBASE_type,
  project_id: process.env.FIREBASE_project_id,
  private_key_id: process.env.FIREBASE_private_key_id,
  private_key: process.env.FIREBASE_private_key,
  client_email: process.env.FIREBASE_client_email,
  client_id: process.env.FIREBASE_client_id,
  auth_uri: process.env.FIREBASE_auth_uri,
  token_uri: process.env.FIREBASE_token_uri,
  auth_provider_x509_cert_url:process.env.FIREBASE_auth_provider_x509_cert_url,
  client_x509_cert_url: process.env.FIREBASE_client_x509_cert_url,
  universe_domain: process.env.FIREBASE_universe_domain
}

firebaseAdmin.initializeApp({
  credential:firebaseAdmin.credential.cert(serviceAccount),
  storageBucket:process.env.FIREBASE_STORAGE
})  

export const bucket = firebaseAdmin.storage().bucket();


