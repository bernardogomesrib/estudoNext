'use server';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { deleteInvoicee, saveInvoice, updateInvoicee } from './data';

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.coerce.number(),
    status: z.enum(['pending', 'paid']),
    date: z.string(),
  });
  
const CreateInvoice = FormSchema.omit({ id: true, date: true });
 
export async function createInvoice(formData: FormData) {
    const { customerId, amount, status } = CreateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
      });
      // Test it out:
      const date = new Date().toISOString().split('T')[0];
      const amountInCents = amount * 100;
      console.log({customerId,status,date,amountInCents});
      let result = null;
      try {
        result = await saveInvoice(customerId,amountInCents,status,date);
      console.log(typeof amount);
        
      } catch (error) {
        return {
            message: 'Database Error: Failed to Create Invoice.',
          };
      }
      revalidatePath('/dashboard/invoices');
        if(result.affectedRows>=1){
            redirect('/dashboard/invoices');
        }
      
}
const UpdateInvoice = FormSchema.omit({ id: true, date: true });
export async function updateInvoice(id: string, formData: FormData) {
    const { customerId, amount, status } = UpdateInvoice.parse({
      customerId: formData.get('customerId'),
      amount: formData.get('amount'),
      status: formData.get('status'),
    });
   
    const amountInCents = amount * 100;
   try {
    updateInvoicee(customerId,amountInCents,status,id);
   
   } catch (error) {
    return { message: 'Database Error: Failed to Update Invoice.' };
   }
    
   revalidatePath('/dashboard/invoices');
   redirect('/dashboard/invoices');
  }

  export async function deleteInvoice(id: string) {
    try {
        await deleteInvoicee(id);
    } catch (error) {
        return { message: 'Database Error: Failed to Delete Invoice.' };
    }
    
    revalidatePath('/dashboard/invoices');
  }


  export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
  ) {
    try {
      await signIn('credentials', formData);
    } catch (error) {
      if (error instanceof AuthError) {
        switch (error.type) {
          case 'CredentialsSignin':
            return 'Invalid credentials.';
          default:
            return 'Something went wrong.';
        }
      }
      throw error;
    }
  }