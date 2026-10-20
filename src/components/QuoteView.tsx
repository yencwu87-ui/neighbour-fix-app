import { View } from 'react-native';
import { money, quoteTotals } from '../lib/money';
import type { Quote } from '../lib/types';
import { Body, H2, Line, Small } from './ui';

export function QuoteView({ quote, ownMaterials }: { quote: Quote; ownMaterials?: boolean }) {
  const t = quoteTotals(quote);
  return (
    <View style={{ gap: 6 }}>
      <H2>Labour</H2>
      {t.callout ? <Line left="Call-out fee" right={money(t.callout)} /> : null}
      {(quote.labour ?? []).length ? quote.labour.map((l, i) => <Line key={i} left={l.desc} right={money(l.amount)} />) : <Small>None listed</Small>}
      <H2>Materials</H2>
      {(quote.materials ?? []).length ? quote.materials.map((m, i) => (
        <View key={i}>
          <Line left={`${m.item}${m.qty !== 1 ? ` × ${m.qty}` : ''}`} right={money((Number(m.qty) || 0) * (Number(m.unit) || 0))} />
          <Small>{[m.spec, `${money(m.unit)} each`, m.receipt ? 'receipt shared' : null].filter(Boolean).join(', ')}</Small>
        </View>
      )) : <Small>{ownMaterials ? "You're supplying materials" : 'None listed'}</Small>}
      {(quote.fees ?? []).map((f) => <Line key={f.key} left={f.label} right={money(f.amount)} />)}
      <Line left="Total" right={money(t.total)} strong />
      {quote.markup ? <Body muted>Materials policy: {quote.markup}</Body> : null}
    </View>
  );
}
