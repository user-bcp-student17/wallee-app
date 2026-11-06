import { DefaultNamingStrategy } from 'typeorm';

const toSnake = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

export class SnakeNamingStrategy extends DefaultNamingStrategy {
  columnName(propertyName: string, customName: string | undefined, embeddedPrefixes: string[]) {
    return toSnake([...embeddedPrefixes, customName ?? propertyName].join('_'));
  }
}
