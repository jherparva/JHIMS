
import mongoose from "mongoose";
import { connectDB } from "./lib/db/mongodb";
import Sale from "./lib/db/models/Sale";

async function diagnostic() {
    await connectDB();
    console.log("Conectado a la DB para diagnóstico...");
    
    const count = await Sale.countDocuments({});
    console.log("Total de ventas en la DB:", count);
    
    if (count > 0) {
        const sample = await Sale.findOne({}).lean();
        console.log("Ejemplo de venta:", JSON.stringify(sample, null, 2));
        
        // Ver las empresas presentes
        const companies = await Sale.distinct("companyId");
        console.log("IDs de empresas con ventas:", companies);
    }
    
    process.exit(0);
}

diagnostic();
