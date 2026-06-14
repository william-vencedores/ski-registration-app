import type { Handler } from 'aws-lambda';
import * as repo from './repository/dynamo-repository.js';
import * as adminUserService from './services/admin-user-service.js';
import * as disclosureService from './services/disclosure-service.js';
import * as eventService from './services/event-service.js';
import { config } from './config/index.js';

export const handler: Handler = async () => {
  // Create table if using local DynamoDB
  try {
    await repo.createTableIfNotExists();
  } catch (e) {
    console.warn('Could not create/check table (may already exist in AWS):', e);
  }

  // Seed default admin user if none exists
  try {
    await adminUserService.ensureDefaultAdmin(
      config.admin.defaultUsername,
      config.admin.defaultPassword
    );
    console.info(`Default admin user ensured: ${config.admin.defaultUsername}`);
  } catch (e) {
    console.error('Failed to seed default admin:', e);
  }

  // Seed default disclosures if none exist
  try {
    await seedDefaultDisclosures();
  } catch (e) {
    console.error('Failed to seed default disclosures:', e);
  }

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};

async function seedDefaultDisclosures() {
  const existing = await disclosureService.listDisclosures();

  let liabilityId: string | null = null;
  let medicalId: string | null = null;

  if (existing.length > 0) {
    console.info(`Disclosures already exist (${existing.length}), skipping creation`);
    liabilityId = existing.find((d) =>
      ((d.titleEn as string) || '').includes('Liability')
    )?.id as string ?? null;
    medicalId = existing.find((d) =>
      ((d.titleEn as string) || '').includes('Medical')
    )?.id as string ?? null;
  } else {
    console.info('No disclosures found — seeding defaults...');

    // 1. Liability Waiver
    const liability = await disclosureService.createDisclosure({
      titleEs: '\u2696\uFE0F Exenci\u00F3n de Responsabilidad / Liability Waiver',
      titleEn: '\u2696\uFE0F Liability Waiver',
      contentEs: `<h4 class="font-bold text-slate-800 mb-2 text-[13px]">EXENCI\u00D3N DE RESPONSABILIDAD \u2014 VENCEDORES SKI GROUP</h4>
<p class="mb-3">Yo, el abajo firmante, reconozco que el esqu\u00ED y el snowboard conllevan riesgos inherentes de lesiones f\u00EDsicas, incluyendo fracturas, esguinces, contusiones, y en casos extremos, lesiones graves o muerte.</p>
<p class="mb-3">Al participar voluntariamente en el evento de Vencedores Ski Group, yo y mis herederos relevamos a Vencedores Ski Group, sus organizadores, voluntarios y patrocinadores de toda responsabilidad.</p>
<h4 class="font-bold text-slate-800 mb-2 text-[13px]">LIABILITY WAIVER \u2014 VENCEDORES SKI GROUP</h4>
<p>By participating, I release Vencedores Ski Group, its organizers, volunteers, and sponsors from all liability for personal injury or property damage arising from my participation.</p>`,
      contentEn: `<h4 class="font-bold text-slate-800 mb-2 text-[13px]">LIABILITY WAIVER \u2014 VENCEDORES SKI GROUP</h4>
<p class="mb-3">I acknowledge that skiing and snowboarding carry inherent risks of physical injury including fractures, sprains, bruises, and in extreme cases serious injury or death.</p>
<p>By voluntarily participating, I release Vencedores Ski Group, its organizers, volunteers, and sponsors from all liability for personal injury or property damage arising from my participation.</p>`,
      required: true,
    });
    liabilityId = liability.id as string;
    console.info(`Created liability waiver disclosure: ${liabilityId}`);

    // 2. Medical Authorization
    const medical = await disclosureService.createDisclosure({
      titleEs: '\uD83C\uDFE5 Autorizaci\u00F3n M\u00E9dica / Medical Authorization',
      titleEn: '\uD83C\uDFE5 Medical Authorization',
      contentEs: `<h4 class="font-bold text-slate-800 mb-2 text-[13px]">AUTORIZACI\u00D3N M\u00C9DICA DE EMERGENCIA</h4>
<p class="mb-3">En caso de emergencia m\u00E9dica, autorizo a los organizadores a proporcionar o buscar tratamiento m\u00E9dico en mi nombre, incluyendo transporte a un centro m\u00E9dico apropiado.</p>
<h4 class="font-bold text-slate-800 mb-2 text-[13px]">EMERGENCY MEDICAL AUTHORIZATION</h4>
<p>In case of medical emergency, I authorize organizers and first aid personnel to provide or seek medical treatment on my behalf, including transportation to an appropriate medical facility.</p>`,
      contentEn: `<h4 class="font-bold text-slate-800 mb-2 text-[13px]">EMERGENCY MEDICAL AUTHORIZATION</h4>
<p>In case of a medical emergency during my participation, I authorize the organizers and first aid personnel to provide or seek medical treatment on my behalf, including transportation to an appropriate medical facility.</p>`,
      required: true,
    });
    medicalId = medical.id as string;
    console.info(`Created medical authorization disclosure: ${medicalId}`);
  }

  // Always check that disclosures are attached to all events
  if (!liabilityId && !medicalId) {
    console.warn('Could not identify default disclosures for event attachment');
    return;
  }

  const events = await eventService.listEvents(false);
  for (const event of events) {
    const eventId = event.id as string;
    const eventDisclosures = await disclosureService.getEventDisclosures(eventId);
    if (eventDisclosures.length === 0) {
      if (liabilityId) await disclosureService.attachToEvent(eventId, liabilityId, 1);
      if (medicalId) await disclosureService.attachToEvent(eventId, medicalId, 2);
      console.info(`Attached disclosures to event: ${eventId}`);
    }
  }

  console.info('Default disclosures seeded successfully');
}
