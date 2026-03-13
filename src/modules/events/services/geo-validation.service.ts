import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import type { Feature, Polygon, MultiPolygon } from 'geojson';

interface GeoJSONCollection {
  features: Feature<Polygon | MultiPolygon, { departamento?: string }>[];
}

function safeParseGeoJSON(raw: string): GeoJSONCollection {
  const parsed: unknown = JSON.parse(raw);
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('features' in parsed) ||
    !Array.isArray((parsed as GeoJSONCollection).features)
  ) {
    throw new Error('GeoJSON inválido: falta el array de features');
  }
  return parsed as GeoJSONCollection;
}

@Injectable()
export class GeoValidationService implements OnModuleInit {
  private readonly logger = new Logger(GeoValidationService.name);
  private polygons = new Map<string, Feature<Polygon | MultiPolygon>>();

  private static readonly NAME_EXCEPTIONS: Record<string, string> = {
    'CORONEL ROSALES': 'CORONEL DE MARINA LEONARDO ROSALES',
    'JOSE C. PAZ': 'JOSE C PAZ',
    'LEANDRO N. ALEM': 'LEANDRO N ALEM',
    'NUEVE DE JULIO': '9 DE JULIO',
    'VEINTICINCO DE MAYO': '25 DE MAYO',
  };

  onModuleInit() {
    this.loadGeoJSON();
  }

  private loadGeoJSON() {
    try {
      // Try dist path first, then fall back to src path (for dev with ts-node)
      let filePath = path.join(__dirname, '../data/buenos-aires-partidos.json');
      if (!fs.existsSync(filePath)) {
        filePath = path.join(
          process.cwd(),
          'src/modules/events/data/buenos-aires-partidos.json',
        );
      }
      const raw = fs.readFileSync(filePath, 'utf-8');
      const geojson = safeParseGeoJSON(raw);
      for (const feature of geojson.features) {
        const departamento = feature.properties?.departamento;
        const name =
          typeof departamento === 'string'
            ? departamento.toUpperCase().trim()
            : '';
        if (name) {
          this.polygons.set(name, feature);
        }
      }

      this.logger.log(
        `Loaded ${this.polygons.size} partido polygons for geo-validation`,
      );
    } catch (error) {
      this.logger.error('Failed to load GeoJSON for geo-validation', error);
    }
  }

  private normalizeName(cityName: string): string {
    const upper = cityName.toUpperCase().trim();
    return GeoValidationService.NAME_EXCEPTIONS[upper] || upper;
  }

  isPointInPartido(cityName: string, lat: number, lng: number): boolean {
    const normalizedName = this.normalizeName(cityName);
    const feature = this.polygons.get(normalizedName);

    if (!feature) {
      this.logger.warn(
        `No polygon found for partido "${cityName}" (normalized: "${normalizedName}"). Allowing by default.`,
      );
      return true;
    }

    const pt = point([lng, lat]);
    return booleanPointInPolygon(pt, feature);
  }
}
