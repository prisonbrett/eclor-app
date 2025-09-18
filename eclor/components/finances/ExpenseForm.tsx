"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
  type ChangeEvent,
} from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useExpenseForm } from "@/features/depenses/ExpenseFormProvider";
import SingleSelect from "@/components/ui/SingleSelect";
import {
  DEPENSES_CATEGORIES,
  DEPENSES_TYPES,
} from "@/constants/DepensesSchema";

const v = (s?: string | null) => s ?? "";
const n = (s?: number | null) => s ?? null;

// Helper to format date to YYYY-MM-DD
const formatDate = (date: Date) => {
  const d = new Date(date);
  let month = "" + (d.getMonth() + 1);
  let day = "" + d.getDate();
  const year = d.getFullYear();

  if (month.length < 2) month = "0" + month;
  if (day.length < 2) day = "0" + day;

  return [year, month, day].join("-");
};

const parseDate = (dateString: string): Date | null => {
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
};

export default function ExpenseForm() {
  const { open, setOpen, form, setForm, resetForm } = useExpenseForm();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (Platform.OS === "web") {
      window.addEventListener("keydown", onKey, { passive: true });
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [open, setOpen]);

  // Conditional Logic
  useEffect(() => {
    // If category is "Parking", set libellé to "Parking" and clear type
    if (form.categorie === "🅿️ Parking") {
      setForm((prev) => ({ ...prev, libelle: "Parking", type: "" }));
    }
  }, [form.categorie, setForm]);

  if (!open) return null;

  const handleOverlayClick = () => {
    setOpen(false);
  };

  const handleSubmit = async () => {
    setLoading(true);
    console.log("Form submitted:", form);

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setSent(true);
      resetForm();
    }, 1500); // 1.5 second delay
  };

  const [dateInput, setDateInput] = useState('');

  useEffect(() => {
    // When the form is opened/reset, sync the dateInput with the context
    if (form.datePaiement) {
      setDateInput(formatDate(new Date(form.datePaiement)));
    } else {
      setDateInput('');
    }
  }, [form.datePaiement]);

  const isFormValid =
    v(form.categorie).trim() !== "" &&
    v(form.libelle).trim() !== "" &&
    n(form.montantTTC) !== null &&
    form.montantTTC > 0 &&
    form.datePaiement !== null;

  if (sent) {
    return (
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <Text style={styles.successText}>
            ✅ Dépense ajoutée avec succès!
          </Text>
          <Pressable
            style={[styles.button, { marginTop: 20 }]}
            onPress={() => {
              setOpen(false); // Close the modal
              // Also reset the 'sent' state for the next time the form opens
              setTimeout(() => setSent(false), 200); // delay to prevent flash
            }}
          >
            <Text style={styles.buttonText}>Fermer</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.overlay}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={handleOverlayClick} />
      <View style={styles.panel}>
        <ScrollView>
          <Text style={styles.title}>Ajouter une dépense</Text>
          <View style={styles.form}>
            <SingleSelect
              placeholder="Catégorie *"
              options={DEPENSES_CATEGORIES}
              value={form.categorie}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, categorie: value || "" }))
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Libellé *"
              value={form.libelle}
              onChangeText={(text) =>
                setForm((prev) => ({ ...prev, libelle: text }))
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Date (YYYY-MM-DD) *"
              value={dateInput}
              onChangeText={(text) => {
                setDateInput(text);
                const parsed = parseDate(text);
                setForm((prev) => ({ ...prev, datePaiement: parsed }));
              }}
            />
            <TextInput
              style={styles.input}
              placeholder="Montant TTC *"
              value={form.montantTTC?.toString() || ""}
              onChangeText={(text) =>
                setForm((prev) => ({
                  ...prev,
                  montantTTC: parseFloat(text) || null,
                }))
              }
              keyboardType="numeric"
            />

            {form.categorie && form.categorie !== "🅿️ Parking" && (
              <SingleSelect
                placeholder="Type"
                options={DEPENSES_TYPES}
                value={form.type}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, type: value || "" }))
                }
              />
            )}

            {form.type === "🔁 Abonnement" && (
              <TextInput
                style={styles.input}
                placeholder="Durée (en mois)"
                value={form.duree?.toString() || ""}
                onChangeText={(text) =>
                  setForm((prev) => ({
                    ...prev,
                    duree: parseInt(text, 10) || null,
                  }))
                }
                keyboardType="numeric"
              />
            )}
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <Pressable
            style={[styles.button, (!isFormValid || loading) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!isFormValid || loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Envoi en cours...' : 'Envoyer'}</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  panel: {
    width: "90%",
    maxWidth: 600,
    maxHeight: "90%",
    backgroundColor: "white",
    borderRadius: 14,
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },
  form: {
    gap: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  footer: {
    marginTop: 20,
    alignItems: "flex-end",
  },
  button: {
    backgroundColor: "black",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  successText: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
});
