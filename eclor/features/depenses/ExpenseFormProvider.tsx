"use client";
import React, { createContext, useContext, useState } from "react";
import type { DepenseRow } from '@/app/types/Depenses';

// We only need a subset of fields for the form
export type ExpenseFormType = Pick<DepenseRow,
  'libelle' |
  'montantTTC' |
  'datePaiement' |
  'categorie' |
  'type' |
  'duree' |
  'facture'
>;

type Ctx = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  form: ExpenseFormType;
  setForm: React.Dispatch<React.SetStateAction<ExpenseFormType>>;
  resetForm: () => void;
};

const ExpenseFormContext = createContext<Ctx | null>(null);

export function useExpenseForm() {
  const ctx = useContext(ExpenseFormContext);
  if (!ctx) throw new Error("useExpenseForm must be used within <ExpenseFormProvider>");
  return ctx;
}

const EMPTY_FORM: ExpenseFormType = {
  libelle: "",
  montantTTC: null,
  datePaiement: new Date(),
  categorie: "",
  type: "",
  duree: null,
  facture: "",
};

export function ExpenseFormProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ExpenseFormType>(EMPTY_FORM);

  const resetForm = () => setForm({
    ...EMPTY_FORM,
    datePaiement: new Date(), // Reset with today's date
  });

  return (
    <ExpenseFormContext.Provider value={{ open, setOpen, form, setForm, resetForm }}>
      {children}
    </ExpenseFormContext.Provider>
  );
}
