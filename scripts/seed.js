const mysql = require('mysql2');
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'senha1234',
  database: 'teste'
});

db.connect((err) => {
  if (err) throw err;
  console.log('Conectado!');
});

const {
  invoices,
  customers,
  revenue,
  users,
} = require('../app/lib/placeholder-data.js');
const bcrypt = require('bcrypt');

async function seedUsers(db) {
  try {

    // Insert data into the "users" table
    const insertedUsers = await Promise.all(
      users.map(async (user) => {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        const insertUser = `INSERT INTO users (id, name, email, password)
          VALUES ('${user.id}', '${user.name}', '${user.email}', '${hashedPassword}')`;

        db.query(insertUser, (err, results) => {
          if (err) throw err;
        });
      }),
    );

    console.log(`Seeded ${users.length} users`);

    return {
      users: insertedUsers,
    };
  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  }
}

async function seedInvoices(db) {
  try {
    console.log(`Created "invoices" table`);

    // Insert data into the "invoices" table
    const insertedInvoices = await Promise.all(
      invoices.map(
        async (invoice) => {
          const [rows, fields] = await db.execute(`
            INSERT INTO invoices (customer_id, amount, status, date)
            VALUES (?, ?, ?, ?)
          `, [invoice.customer_id, invoice.amount, invoice.status, invoice.date]);
        }
      ),
    );

    console.log(`Seeded ${insertedInvoices} invoices`);

    return {
      invoices: insertedInvoices,
    };
  } catch (error) {
   0// console.error('Error seeding invoices:', error);
   // throw error;
  }
}


async function seedCustomers(db) {
  try {
   
    // Insert data into the "customers" table
    const insertedCustomers = await Promise.all(
      customers.map(
        async (customer) =>{
        const [rows,fields] = await db.execute(`
        INSERT INTO customers (id, name, email, image_url)
        VALUES (?,?,?,?)
      `,[customer.id, customer.name, customer.email, customer.image_url]
      )}
    )
  );

    console.log(`Seeded ${insertedCustomers} customers`);

    return {
      
      customers: insertedCustomers,
    };
  } catch (error) {
    //console.error('Error seeding customers:', error);
  }
}

async function seedRevenue(db) {
  try {
   
    // Insert data into the "revenue" table
    const insertedRevenue = await Promise.all(
      revenue.map(
        async (rev) =>{
        const [rows,fields] = await db.execute(`
        INSERT INTO revenue (month, revenue)
        VALUES (?,?)
      `,[rev.month, rev.revenue])}
      ),
    );

    console.log(`Seeded ${insertedRevenue} revenue`);

    return {
      
      revenue: insertedRevenue,
    };
  } catch (error) {
    //console.error('Error seeding revenue:', error);
    //throw error;
  }
}

async function main() {
  
  await seedUsers(db);
  await seedCustomers(db);
  await seedInvoices(db);
  await seedRevenue(db);

  await db.end();
}

main().catch((err) => {
  console.error(
    'An error occurred while attempting to seed the database:',
    err,
  );
});
