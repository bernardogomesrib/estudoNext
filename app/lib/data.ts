const mysql = require('mysql2');
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'senha1234',
  database: 'teste'
});

db.connect((err: any) => {
  if (err) throw err;
  console.log('Conectado!');
});

import { RowDataPacket } from 'mysql2';
import { unstable_noStore as noStore } from 'next/cache';
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoice,
  Revenue,
  User
} from './definitions';
import { formatCurrency } from './utils';

export async function fetchRevenue(): Promise<Revenue[]> {
  noStore();
  console.log('Fetching revenue data...');
  await new Promise((resolve) => setTimeout(resolve, 3000));
  return new Promise((resolve, reject) => {
    db.query(`SELECT * FROM revenue`, (error:any, results: RowDataPacket[]) => {
      if (error) {
        console.error('Database Error:', error);
        reject(new Error('Failed to fetch revenue data.'));
      } else {
        console.log('Data fetch completed after 3 seconds.');
        resolve(results as Revenue[]);
      }
    });
  });
}


export async function fetchLatestInvoices():Promise<LatestInvoice[]> {
  noStore();
  return new Promise((resolve,reject)=>{
    db.query(`SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    ORDER BY invoices.date DESC
    LIMIT 5`,(error:any,results:RowDataPacket[])=>{
      if(error){
        console.error("Database Error:",error);
        reject(new Error("Failed to fetch Latest Invoice"))
      }else{
        resolve(results as LatestInvoice[])
      }
    })
  });
}

export async function fetchCardData() {
  noStore();
  const invoiceCountPromise = new Promise((resolve,reject) =>{
    db.query('SELECT COUNT(*) FROM invoices',(error:any,results:RowDataPacket[])=>{
      if(error){
        console.error("Database Error:",error);
        reject(new Error("Failed to fetch invoice count"))
      }else{
        //console.log(results)
        resolve(results)
      }
    })
  });
  const customerCountPromise =new Promise((resolve,reject) =>{
    db.query('SELECT COUNT(*) FROM customers',(error:any,results:RowDataPacket[])=>{
      if(error){
        console.error("Database Error:",error);
        reject(new Error("Failed to fetch customer count"))
      }else{
        //console.log(results)
        resolve(results)
      }
    })
  });
  const invoiceStatusPromise = new Promise((resolve,reject) =>{
    db.query(`SELECT
    SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
    SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
    FROM invoices`,(error:any,results:RowDataPacket[])=>{
      if(error){
        console.error("Database Error:",error);
        reject(new Error("Failed to fetch invoice status"))
      }else{
        //console.log(results)
        resolve(results)
      }
    })
  });
  const data = await Promise.all([
    invoiceCountPromise,
    customerCountPromise,
    invoiceStatusPromise
  ])

  
  //console.log(invoiceCountPromise)
  
  
const numberOfInvoices = Number(data[0][0]['COUNT(*)'] ?? '0');
const numberOfCustomers = Number(data[1][0]['COUNT(*)'] ?? '0');
const totalPaidInvoices = formatCurrency(data[2][0].paid ?? '0');
const totalPendingInvoices = formatCurrency(data[2][0].pending ?? '0');
    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(query: string, currentPage: number) {
  noStore();
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  const invoices = new Promise((resolve,reject) =>{
    db.query(`
    SELECT
      invoices.id,
      invoices.amount,
      invoices.date,
      invoices.status,
      customers.name,
      customers.email,
      customers.image_url
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE
      customers.name LIKE '${`%${query}%`}' OR
      customers.email LIKE '${`%${query}%`}' OR
      invoices.date LIKE '${`%${query}%`}' OR
      invoices.status LIKE '${`%${query}%`}'
    ORDER BY invoices.date DESC
    LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
  `,(error:any,results:RowDataPacket[])=>{
      if(error){
        console.error("Database Error:",error);
        reject(new Error("Failed to fetch invoices"))
      }else{
        //console.log(results)
        resolve(results as InvoicesTable[])
      }
    })
  });
  {/**try {
    const invoices = await sql<InvoicesTable>`
      SELECT
        invoices.id,
        invoices.amount,
        invoices.date,
        invoices.status,
        customers.name,
        customers.email,
        customers.image_url
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE
        customers.name LIKE '${`%${query}%`}' OR
        customers.email LIKE '${`%${query}%`}' OR
        invoices.date LIKE '${`%${query}%`}' OR
        invoices.status LIKE '${`%${query}%`}'
      ORDER BY invoices.date DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `;
  */}
    return invoices;
 {/*( } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  })*/}
}

export async function fetchInvoicesPages(query: string) {
  noStore();
  const count = await new Promise((resolve,reject) =>{
    db.query(`SELECT COUNT(*)
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE
      customers.name LIKE '${`%${query}%`}' OR
      customers.email LIKE '${`%${query}%`}' OR
      invoices.date LIKE '${`%${query}%`}' OR
      invoices.status LIKE '${`%${query}%`}'
  `,(error:any,results:RowDataPacket[])=>{
      if(error){
        console.error("Database Error:",error);
        reject(new Error("Failed to fetch total number of invoices."));
      }else{
        //console.log(results)
        resolve(results);
      }
    })
  });
 
  const totalPages = Math.ceil(Number(count[0]['COUNT(*)']) / ITEMS_PER_PAGE);
    return totalPages;

}

export async function fetchInvoiceById(id: string) {
  noStore();
  const data = await new Promise((resolve,reject) =>{
    db.query(`
    SELECT
      invoices.id,
      invoices.customer_id,
      invoices.amount,
      invoices.status
    FROM invoices
    WHERE invoices.id = '${id}';
  `,(error:any,results:RowDataPacket[])=>{
      if(error){
        console.error("Database Error:",error);
        reject(new Error("Failed to fetch invoice"))
      }else{
        //console.log(results)
        resolve(results as InvoiceForm[])
      }
    })
  });

  const invoice = data.map((invoice) => ({
    ...invoice,
    
    amount: invoice.amount / 100,
  }));

  return invoice[0];
  {/*try {
    const data = await sql<InvoiceForm>`
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status
      FROM invoices
      WHERE invoices.id = ${id};
    `;

    const invoice = data.rows.map((invoice) => ({
      ...invoice,
      
      amount: invoice.amount / 100,
    }));

    return invoice[0];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }*/}
}

export async function fetchCustomers() {
  noStore();
  const data = await new Promise((resolve, reject) => {
    db.query(`
    SELECT
      id,
      name
    FROM customers
    ORDER BY name ASC
  `, (error:any, results: RowDataPacket[]) => {
      if (error) {
        console.error('Database Error:', error);
        reject(new Error('Failed to fetch all customers.'));
      } else {
        resolve(results as CustomerField[]);
      }
    });
  });
  const customers = data;
  //console.log(customers);
    return customers;
  {/*
  try {
    const data = await sql<CustomerField>`
      SELECT
        id,
        name
      FROM customers
      ORDER BY name ASC
    `;

    const customers = data.rows;
    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
 */}
}

export async function fetchFilteredCustomers(query: string) {
  noStore();
  const data =  await new Promise((resolve, reject) => {
    db.query(`
    SELECT
    customers.id,
    customers.name,
    customers.email,
    customers.image_url,
    COUNT(invoices.id) AS total_invoices,
    SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
    SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
  FROM customers
  LEFT JOIN invoices ON customers.id = invoices.customer_id
  WHERE
    customers.name LIKE '${`%${query}%'`} OR
      customers.email LIKE '${`%${query}%'`}
  GROUP BY customers.id, customers.name, customers.email, customers.image_url
  ORDER BY customers.name ASC
  `, (error:any, results: RowDataPacket[]) => {
      if (error) {
        console.error('Database Error:', error);
        reject(new Error('Failed to fetch all customers.'));
      } else {
        resolve(results as CustomersTableType[]);
      }
    });
  });
  {/*
  try {
    const data = await sql<CustomersTableType>`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name LIKE ${`%${query}%`} OR
        customers.email LIKE ${`%${query}%`}
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;
*/}

    const customers = data.map((customer:any) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  
}

export async function getUser(email: string):Promise<User[]> {
  return await new Promise((resolve, reject) => {
    db.query(`SELECT * FROM users WHERE email='${email}'`,
    (error:any, results: RowDataPacket[]) => {
      if (error) {
        console.error('Database Error:', error);
        reject(new Error('Failed to fetch user'));
      } else {
        resolve(results as User[]);
      }
    });
  });
 {/*
  try {
    const user = await sql`SELECT * FROM users WHERE email=${email}`;
    return user.rows[0] as User;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
 */}
}
export async function  saveInvoice(customerId:String,amountInCents:Number,status:String,date:String) {
  return await new Promise((resolve,reject)=>{
    db.query(`INSERT INTO invoices (customer_id, amount, status, date)
    VALUES ('${customerId}', '${amountInCents}', '${status}', '${date}')`,
    (error:any, results: RowDataPacket[]) => {
      if (error) {
        console.error('Database Error:', error);
        reject(new Error('Failed to save invoice'));
      } else {
        resolve(results);
      }
    });
  });
}
export async function updateInvoicee( customerId:String,amountInCents:Number, status:String,id:String) {
  
  return await new Promise((resolve,reject)=>{
    db.query(`UPDATE invoices  SET customer_id = '${customerId}', amount = ${amountInCents}, status = '${status}'  WHERE id ='${id}'`,
    (error:any, results: RowDataPacket[]) => {
      if (error) {
        console.error('Database Error:', error);
        reject(new Error('Failed to update invoice'));
      } else {
        resolve(results);
      }
    });
  });
}
export async function deleteInvoicee(id:String) {
  return await new Promise((resolve,reject)=>{
    db.query(`DELETE FROM invoices WHERE id = '${id}'`,
    (error:any, results: RowDataPacket[]) => {
      if (error) {
        console.error('Database Error:', error);
        reject(new Error('Failed to delete invoice'));
      } else {
        resolve(results);
      }
    });
  });
}