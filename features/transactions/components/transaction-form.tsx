import { z } from "zod";
import { Trash } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { convertAmountToMiliunits, parseAmountFromString } from "@/lib/utils";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/date-picker";
import { Select } from "@/components/select";
import { insertTransactionSchema } from "@/db/schema";
import { Textarea } from "@/components/ui/textarea";
import { AmountInput } from "@/components/amount-input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";

const formSchema = z.object({
  date: z.coerce.date(),
  accountId: z.string(),
  categoryId: z.string().nullable().optional(),
  payee: z.string(),
  amount: z.string(),
  notes: z.string().nullable().optional(),
});

const apiSchema = insertTransactionSchema.omit({
  id: true,
});

type FormValues = z.input<typeof formSchema>;
type ApiFormValues = z.input<typeof apiSchema>;

type Props = {
  id?: string;
  defaultValues?: FormValues;
  onSubmit: (values: ApiFormValues) => void;
  onDelete?: () => void;
  disabled?: boolean;
  accountOptions: { label: string; value: string }[];
  categoryOptions: { label: string; value: string }[];
  onCreateAccount: (name: string) => void;
  onCreateCategory: (name: string) => void;
};

export const TransactionForm = ({
  id,
  defaultValues,
  onSubmit,
  onDelete,
  disabled,
  accountOptions,
  categoryOptions,
  onCreateAccount,
  onCreateCategory,
}: Props) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues,
  });

  const handleSubmit = (values: FormValues) => {
    const amount = parseAmountFromString(values.amount);
    const amountInMiliunits = convertAmountToMiliunits(amount);

    const payload = {
      ...values,
      amount: amountInMiliunits,
    } as unknown as ApiFormValues;
    onSubmit(payload);
  };

  const handleDelete = () => {
    onDelete?.();
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="grid w-full max-w-sm gap-4 mx-auto lg:mx-0"
      >
        <FormField<FormValues>
          name="date"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <DatePicker
                  value={field.value as Date | undefined}
                  onChange={field.onChange}
                  disabled={disabled}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField<FormValues>
          name="accountId"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account</FormLabel>
              <FormControl>
                <Select
                  placeholder="Select an account"
                  options={accountOptions}
                  onCreate={onCreateAccount}
                  value={field.value as string}
                  onChange={field.onChange}
                  disabled={disabled}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField<FormValues>
          name="categoryId"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl>
                <Select
                  placeholder="Select a category"
                  options={categoryOptions}
                  onCreate={onCreateCategory}
                  value={field.value as string | null | undefined}
                  onChange={field.onChange}
                  disabled={disabled}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField<FormValues>
          name="payee"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payee</FormLabel>
              <FormControl>
                <Input
                  disabled={disabled}
                  placeholder="Add a payee"
                  name={field.name}
                  ref={field.ref}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  value={field.value as string}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField<FormValues>
          name="amount"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <AmountInput
                  value={field.value as string}
                  onChange={field.onChange as (v: string | undefined) => void}
                  disabled={disabled}
                  placeholder="0,00"
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField<FormValues>
          name="notes"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  name={field.name}
                  ref={field.ref}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  value={(field.value as string | null | undefined) ?? ""}
                  disabled={disabled}
                  placeholder="Add notes (optional)"
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button className="w-full" disabled={disabled}>
          {id ? "Save Changes" : "Create transaction"}
        </Button>
        {!!id && (
          <Button
            type="button"
            disabled={disabled}
            onClick={handleDelete}
            className="w-full"
            variant="outline"
          >
            <Trash className="size-4 mr-2" />
            Delete transaction
          </Button>
        )}
      </form>
    </Form>
  );
};
