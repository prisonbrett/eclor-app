// app/finances/depenses/a-classer/index.tsx
import React, { useMemo, useEffect, useState } from 'react';
import { View, StyleSheet, useWindowDimensions, Text } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LogoButton from '@/components/ui/LogoButton';
import PageTag from '@/components/ui/PageTag';
import SideMenu from '@/components/ui/SideMenu';
import MenuPill from '@/components/ui/MenuPill';
import BackPill from '@/components/ui/BackPill';
import TableView, { TableColumn } from '@/components/ui/TableView';
import { useExpenseForm } from '@/features/depenses/ExpenseFormProvider';
import { readSheetRange } from '@/lib/GoogleSheets';
import {
  DEPENSES_SHEET_NAME,
  DEPENSES_HEADERS,
  DEPENSES_CATEGORIES,
  DEPENSES_TYPES,
} from '@/constants/DepensesSchema';
import { mapDepenses } from '@/lib/mapDepenses';
import { fmtDDMMYYYY } from '@/lib/dateSerial';
import EditableTextCell from '@/components/ui/cells/EditableTextCell';
import MoneyCell from '@/components/ui/cells/MoneyCell';
import DateCell from '@/components/ui/cells/DateCell';
import SelectCell from '@/components/ui/cells/SelectCell';

// --- helpers
const euro = (n?: number | null) =>
  !n || !Number.isFinite(n) || n === 0 ? '' :
  `${Number(n).toLocaleString('fr-FR',{ minimumFractionDigits:2, maximumFractionDigits:2 })} €`;

type Row = ReturnType<typeof mapDepenses>[0];

export default function AClasserScreen() {
  const router = useRouter();
  const { setOpen } = useExpenseForm();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();

  const SHEET_ID =
    process.env.EXPO_PUBLIC_GOOGLE_SHEET_ID ??
    process.env.GOOGLE_SHEET_ID ??
    '';
  const RANGE = `'${DEPENSES_SHEET_NAME}'!A:N`; // Corrected range

  const [rows, setRows] = useState<Row[]>([]);
  const [footerData, setFooterData] = useState<Partial<Record<keyof Row, React.ReactNode>> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // persistance des largeurs colonnes
  const LS_KEY_W = 'a-classer:colW';
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') return {};
    try { return JSON.parse(localStorage.getItem(LS_KEY_W) || '{}'); } catch { return {}; }
  });
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem(LS_KEY_W, JSON.stringify(colWidths));
  }, [colWidths]);

  const isDesktop = screenW >= 1024;
  const isPhone = !isDesktop;

  // Marges / logo
  const H_MARGIN = 20;
  const LOGO_W = isPhone ? 120 : 160;
  const LOGO_H = Math.round(LOGO_W / 2.4);

  // Titrage
  const basePhone = 38;
  const baseDesktop = 38;
  let fontSize = Math.max(22, Math.min(isPhone ? basePhone : baseDesktop, screenW * (isPhone ? 0.08 : 0.045)));
  if (!isPhone && screenW >= 600 && screenW <= 1024) fontSize = Math.max(fontSize, 44);
  const lineHeight = Math.round(fontSize + 6);

  const headerOffset = insets.top + 10 + Math.max(LOGO_H, lineHeight) + 8;
  const TABLE_MAX_H = Math.max(240, screenH - headerOffset - (insets.bottom + 28));

  // menu
  const [menuOpen, setMenuOpen] = useState<boolean>(isDesktop);
  const go = (path: string) => { router.replace(path as Href); setMenuOpen(false); };

  // fetch
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!SHEET_ID) { setRows([]); return; }
        setLoading(true);
        const data = await readSheetRange(SHEET_ID, RANGE);
        const values: any[][] = data?.values ?? [];
        if (values.length <= 1) {
          if (mounted) { setRows([]); setFooterData(null); }
          return;
        }

        let body = values.slice(0);
        let totalRowData: any[] | null = null;
        if (body.length > 1 && String(body[body.length - 1][0]).toUpperCase() === 'TOTAL') {
          totalRowData = body.pop() ?? null;
        }

        const mapped = mapDepenses(body);

        if (mounted) {
          setRows(mapped);
          if (totalRowData) {
            const node = (val: any) => (
              <Text style={{ color:'#fff', fontFamily:'Delight-ExtraBold', textAlign:'right' as const }}>
                {euro(Number(String(val ?? 0).toString().replace(/\s/g, '').replace(',', '.')) || 0)}
              </Text>
            );
            setFooterData({
              libelle: <Text style={{ color:'#fff', fontFamily:'Delight-ExtraBold' }}>TOTAL</Text>,
              montantTTC: node(totalRowData[1]),
              estimationAnnuel: node(totalRowData[9]),
              mensualite: node(totalRowData[11]),
              cumule: node(totalRowData[12]),
            });
          } else {
            setFooterData(null);
          }
        }
      } catch (e) {
        console.error('readSheetRange error:', e);
        if (mounted) { setRows([]); setFooterData(null); }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [SHEET_ID, RANGE]);

  // édition locale
  const setField = (rowIndex: number, key: keyof Row, value: any) => {
    setRows(prev => {
      const next = [...prev];
      next[rowIndex] = { ...next[rowIndex], [key]: value };
      return next;
    });
    // Here you would also call a function to save the change to the backend/sheet
  };

  // colonnes
  const columns: TableColumn<Row>[] = useMemo(() => [
    {
      key: 'datePaiement',
      label: DEPENSES_HEADERS.datePaiement,
      width: 180,
      render: (row, i) => <DateCell value={fmtDDMMYYYY(row.datePaiement)} onCommit={(v) => setField(i, 'datePaiement', v)} />,
    },
    {
      key: 'libelle',
      label: DEPENSES_HEADERS.libelle,
      width: 420,
      render: (row, i) => <EditableTextCell value={row.libelle} onCommit={(v) => setField(i, 'libelle', v)} />,
    },
    {
      key: 'categorie',
      label: DEPENSES_HEADERS.categorie,
      width: 230,
      render: (row, i) => <SelectCell value={row.categorie} options={[...DEPENSES_CATEGORIES]} onCommit={(v) => setField(i, 'categorie', v)} />,
    },
    {
      key: 'type',
      label: DEPENSES_HEADERS.type,
      width: 200,
      render: (row, i) => <SelectCell value={row.type} options={[...DEPENSES_TYPES]} onCommit={(v) => setField(i, 'type', v)} />,
    },
    {
      key: 'echeance',
      label: DEPENSES_HEADERS.echeance,
      width: 160,
      render: (row) => <Text style={{ color:'#fff', fontFamily:'Delight-Medium', paddingHorizontal: 10 }}>{fmtDDMMYYYY(row.echeance)}</Text>,
    },
    {
      key: 'joursRestants',
      label: DEPENSES_HEADERS.joursRestants,
      width: 120,
      render: (row) => <Text style={{ color:'#fff', fontFamily:'Delight-Medium' }}>{row.joursRestants}</Text>
    },
    {
      key: 'montantTTC',
      label: DEPENSES_HEADERS.montantTTC,
      width: 140,
      align: 'right',
      render: (row, i) => <MoneyCell value={row.montantTTC} onCommit={(v) => setField(i, 'montantTTC', v)} />,
    },
    {
      key: 'estimationAnnuel',
      label: DEPENSES_HEADERS.estimationAnnuel,
      width: 150,
      align: 'right',
      render: (row) => <Text style={{ color:'#fff', fontFamily:'Delight-Medium', textAlign:'right' as const }}>{euro(row.estimationAnnuel)}</Text>,
    },
    {
      key: 'mensualite',
      label: DEPENSES_HEADERS.mensualite,
      width: 150,
      align: 'right',
      render: (row) => <Text style={{ color:'#fff', fontFamily:'Delight-Medium', textAlign:'right' as const }}>{euro(row.mensualite)}</Text>,
    },
    {
      key: 'cumule',
      label: DEPENSES_HEADERS.cumule,
      width: 150,
      align: 'right',
      render: (row) => <Text style={{ color:'#fff', fontFamily:'Delight-Medium', textAlign:'right' as const }}>{euro(row.cumule)}</Text>,
    },
    {
      key: 'url',
      label: DEPENSES_HEADERS.url,
      width: 240,
      render: (row, i) => <EditableTextCell value={row.url} onCommit={(v) => setField(i, 'url', v)} />,
    },
  ], [rows, setField]);

  // totaux footer
  const footerRow = useMemo(() => {
    if (footerData) return footerData;

    // Fallback to client-side calculation if no footer data from sheet
    const sum = (k: keyof Row) => rows.reduce((acc, r) => acc + (Number((r as any)[k]) || 0), 0);
    const node = (n: number) => (
      <Text style={{ color:'#fff', fontFamily:'Delight-ExtraBold', textAlign:'right' as const }}>
        {euro(n)}
      </Text>
    );
    return {
      libelle: <Text style={{ color:'#fff', fontFamily:'Delight-ExtraBold' }}>TOTAL</Text>,
      montantTTC: node(sum('montantTTC')),
      estimationAnnuel: node(sum('estimationAnnuel')),
      mensualite: node(sum('mensualite')),
      cumule: node(sum('cumule')),
    } as Partial<Record<string, React.ReactNode>>;
  }, [rows, footerData]);

  // Layout (aligné au menu)
  const MENU_W = 300; const MENU_PAD = 20; const GUTTER = 24;
  let tableWidth = screenW - 2 * GUTTER;
  let tableOffsetLeft = 0;
  let alignSelf: 'center' | 'flex-start' = 'center';
  if (isDesktop && menuOpen) {
    tableOffsetLeft = MENU_W + MENU_PAD + GUTTER;
    tableWidth = Math.max(680, screenW - tableOffsetLeft - GUTTER);
    alignSelf = 'flex-start';
  }

  return (
    <View style={[styles.safe, { paddingTop: insets.top + 10 }]}>
      {/* HEADER */}
      <View style={[styles.headerRow, { paddingHorizontal: H_MARGIN }]}>
        <LogoButton width={LOGO_W} height={LOGO_H} onPress={() => router.replace({ pathname: '/' })} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
          <PageTag text="📥 À CLASSER" fontSize={fontSize} lineHeight={lineHeight} />
          <Pressable onPress={() => setOpen(true)} style={styles.addButton}>
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
        </View>
      </View>

      {/* TABLE */}
      <View style={[styles.contentCol, { paddingBottom: insets.bottom + 12 }]}>
        <View style={[
          styles.tableWrap,
          { width: tableWidth, alignSelf, marginLeft: alignSelf === 'flex-start' ? tableOffsetLeft : 0 },
        ]}>
          <TableView<Row>
            columns={columns}
            data={rows}
            loading={loading}
            dense={false}
            maxHeight={TABLE_MAX_H}
            resizable
            columnWidths={colWidths}
            onColumnResize={(k,w) => setColWidths(prev => ({ ...prev, [k]: w }))}
            footerRow={footerRow}
            footerHeight={44}
          />
        </View>
      </View>

      {/* MENU (desktop) */}
      {isDesktop && (
        <>
          <SideMenu
            items={[
              { label: '📥 À CLASSER', active: true, onPress: () => go('/finances/depenses/a-classer') },
              { label: '📅 MOIS', onPress: () => go('/finances/depenses/mois') },
              { label: '📊 TRIMESTRE', onPress: () => go('/finances/depenses/trimestre') },
              { label: '🗓️ ANNÉE', onPress: () => go('/finances/depenses/annee') },
              { label: '🏷️ CATÉGORIE', onPress: () => go('/finances/depenses/categorie') },
              { label: '🔄 ABONNEMENTS', onPress: () => go('/finances/depenses/abonnements') },
              { label: '⏳ AMORTISSEMENTS', onPress: () => go('/finances/depenses/amortissements') },
            ]}
            open={menuOpen}
            onRequestClose={() => setMenuOpen(false)}
            width={MENU_W}
            leftPadding={MENU_PAD}
            topOffset={insets.top + 10 + Math.max(LOGO_H, lineHeight) + 8}
          />
          {!menuOpen && <MenuPill onPress={() => setMenuOpen(true)} left={H_MARGIN} bottom={insets.bottom + 24} />}
        </>
      )}

      {/* BACK (mobile) */}
      {!isDesktop && <BackPill onPress={() => router.back()} left={H_MARGIN} bottom={insets.bottom + 24} />}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#C14E4E', position: 'relative' },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    zIndex: 10,
  },
  contentCol: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    // @ts-ignore web-only
    userSelect: 'none',
  },
  tableWrap: { alignSelf: 'stretch' },
  addButton: {
    backgroundColor: 'white',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addButtonText: {
    color: '#C14E4E',
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 28,
  },
});