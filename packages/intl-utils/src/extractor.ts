import {pickBy, isEmpty, isEqual} from 'lodash';
import {getLocaleHierarchy} from './resolve-locale';
import {LDMLPluralRuleMap} from './number-types';
import {LDMLPluralRule} from './plural-rules-types';

function dedupeUsingParentHierarchy<DataType extends Record<string, any>>(
  ...data: DataType[]
): DataType[] {
  const results: DataType[] = [data.pop()!];
  while (data.length) {
    const datum = data.pop();
    const accumulatedParentData: DataType = Object.assign({}, ...results);
    results.push(
      pickBy<DataType>(
        datum,
        (d, field) => !isEqual(accumulatedParentData[field], d)
      ) as any
    );
  }
  results.reverse();
  return results;
}

export function generateFieldExtractorFn<DataType extends Record<string, any>>(
  loadFieldsFn: (locale: string) => DataType,
  hasDataForLocale: (locale: string) => boolean,
  availableLocales: string[]
) {
  return (locales: string[]) => {
    const fieldCache: Record<string, DataType> = {};

    // Loads and caches the relative fields for a given `locale` because loading
    // and transforming the data is expensive.
    function populateFields(locale: string) {
      if (locale in fieldCache || !hasDataForLocale(locale)) {
        return;
      }

      const localesIncludingParents = getLocaleHierarchy(locale).filter(l =>
        availableLocales.includes(l)
      );

      dedupeUsingParentHierarchy(
        ...localesIncludingParents.map(loadFieldsFn)
      ).forEach((datum, i) => {
        fieldCache[localesIncludingParents[i]] = datum;
      });
    }

    locales.forEach(populateFields);
    return pickBy(fieldCache, o => !isEmpty(o));
  };
}

export function collapseSingleValuePluralRule<T>(
  rules: LDMLPluralRuleMap<T>
): LDMLPluralRuleMap<T> {
  const keys = Object.keys(rules) as Array<LDMLPluralRule>;
  return keys.reduce(
    (all: LDMLPluralRuleMap<T>, k) => {
      if (k !== 'other' && rules[k] && !isEqual(rules[k], rules.other)) {
        all[k] = rules[k];
      }
      return all;
    },
    {other: rules.other}
  );
}

export const PLURAL_RULES: Array<LDMLPluralRule> = [
  'other',
  'zero',
  'one',
  'two',
  'few',
  'many',
];