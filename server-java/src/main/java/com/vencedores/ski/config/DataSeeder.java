package com.vencedores.ski.config;

import com.vencedores.ski.dto.request.CreateDisclosureRequest;
import com.vencedores.ski.repository.DynamoDbRepository;
import com.vencedores.ski.service.AdminUserService;
import com.vencedores.ski.service.DisclosureService;
import com.vencedores.ski.service.EventService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final DynamoDbRepository repo;
    private final AdminUserService adminUserService;
    private final DisclosureService disclosureService;
    private final EventService eventService;

    @Value("${app.admin.default-username}")
    private String defaultUsername;

    @Value("${app.admin.default-password}")
    private String defaultPassword;

    public DataSeeder(DynamoDbRepository repo, AdminUserService adminUserService,
                      DisclosureService disclosureService, EventService eventService) {
        this.repo = repo;
        this.adminUserService = adminUserService;
        this.disclosureService = disclosureService;
        this.eventService = eventService;
    }

    @Override
    public void run(String... args) {
        // Create table if using local DynamoDB
        try {
            repo.createTableIfNotExists();
        } catch (Exception e) {
            log.warn("Could not create/check table (may already exist in AWS): {}", e.getMessage());
        }

        // Seed default admin user if none exists
        try {
            adminUserService.ensureDefaultAdmin(defaultUsername, defaultPassword);
            log.info("Default admin user ensured: {}", defaultUsername);
        } catch (Exception e) {
            log.error("Failed to seed default admin: {}", e.getMessage());
        }

        // Seed default disclosures if none exist
        try {
            seedDefaultDisclosures();
        } catch (Exception e) {
            log.error("Failed to seed default disclosures: {}", e.getMessage());
        }
    }

    private void seedDefaultDisclosures() {
        var existing = disclosureService.listDisclosures();

        String liabilityId;
        String medicalId;

        if (!existing.isEmpty()) {
            log.info("Disclosures already exist ({}), skipping creation", existing.size());
            // Find the existing disclosure IDs for attachment check
            liabilityId = existing.stream()
                    .filter(d -> ((String) d.get("titleEn")).contains("Liability"))
                    .map(d -> (String) d.get("id"))
                    .findFirst().orElse(null);
            medicalId = existing.stream()
                    .filter(d -> ((String) d.get("titleEn")).contains("Medical"))
                    .map(d -> (String) d.get("id"))
                    .findFirst().orElse(null);
        } else {
            log.info("No disclosures found — seeding defaults...");

            // 1. Liability Waiver
            var liabilityReq = new CreateDisclosureRequest();
            liabilityReq.setTitleEs("⚖️ Exención de Responsabilidad / Liability Waiver");
            liabilityReq.setTitleEn("⚖️ Liability Waiver");
            liabilityReq.setContentEs("""
                    <h4 class="font-bold text-slate-800 mb-2 text-[13px]">EXENCIÓN DE RESPONSABILIDAD — VENCEDORES SKI GROUP</h4>
                    <p class="mb-3">Yo, el abajo firmante, reconozco que el esquí y el snowboard conllevan riesgos inherentes de lesiones físicas, incluyendo fracturas, esguinces, contusiones, y en casos extremos, lesiones graves o muerte.</p>
                    <p class="mb-3">Al participar voluntariamente en el evento de Vencedores Ski Group, yo y mis herederos relevamos a Vencedores Ski Group, sus organizadores, voluntarios y patrocinadores de toda responsabilidad.</p>
                    <h4 class="font-bold text-slate-800 mb-2 text-[13px]">LIABILITY WAIVER — VENCEDORES SKI GROUP</h4>
                    <p>By participating, I release Vencedores Ski Group, its organizers, volunteers, and sponsors from all liability for personal injury or property damage arising from my participation.</p>""");
            liabilityReq.setContentEn("""
                    <h4 class="font-bold text-slate-800 mb-2 text-[13px]">LIABILITY WAIVER — VENCEDORES SKI GROUP</h4>
                    <p class="mb-3">I acknowledge that skiing and snowboarding carry inherent risks of physical injury including fractures, sprains, bruises, and in extreme cases serious injury or death.</p>
                    <p>By voluntarily participating, I release Vencedores Ski Group, its organizers, volunteers, and sponsors from all liability for personal injury or property damage arising from my participation.</p>""");
            liabilityReq.setRequired(true);
            var liability = disclosureService.createDisclosure(liabilityReq);
            liabilityId = (String) liability.get("id");
            log.info("Created liability waiver disclosure: {}", liabilityId);

            // 2. Medical Authorization
            var medicalReq = new CreateDisclosureRequest();
            medicalReq.setTitleEs("🏥 Autorización Médica / Medical Authorization");
            medicalReq.setTitleEn("🏥 Medical Authorization");
            medicalReq.setContentEs("""
                    <h4 class="font-bold text-slate-800 mb-2 text-[13px]">AUTORIZACIÓN MÉDICA DE EMERGENCIA</h4>
                    <p class="mb-3">En caso de emergencia médica, autorizo a los organizadores a proporcionar o buscar tratamiento médico en mi nombre, incluyendo transporte a un centro médico apropiado.</p>
                    <h4 class="font-bold text-slate-800 mb-2 text-[13px]">EMERGENCY MEDICAL AUTHORIZATION</h4>
                    <p>In case of medical emergency, I authorize organizers and first aid personnel to provide or seek medical treatment on my behalf, including transportation to an appropriate medical facility.</p>""");
            medicalReq.setContentEn("""
                    <h4 class="font-bold text-slate-800 mb-2 text-[13px]">EMERGENCY MEDICAL AUTHORIZATION</h4>
                    <p>In case of a medical emergency during my participation, I authorize the organizers and first aid personnel to provide or seek medical treatment on my behalf, including transportation to an appropriate medical facility.</p>""");
            medicalReq.setRequired(true);
            var medical = disclosureService.createDisclosure(medicalReq);
            medicalId = (String) medical.get("id");
            log.info("Created medical authorization disclosure: {}", medicalId);
        }

        // Always check that disclosures are attached to all events
        if (liabilityId == null && medicalId == null) {
            log.warn("Could not identify default disclosures for event attachment");
            return;
        }

        var events = eventService.listEvents(false);
        for (var event : events) {
            String eventId = (String) event.get("id");
            var eventDisclosures = disclosureService.getEventDisclosures(eventId);
            if (eventDisclosures.isEmpty()) {
                if (liabilityId != null) {
                    disclosureService.attachToEvent(eventId, liabilityId, 1);
                }
                if (medicalId != null) {
                    disclosureService.attachToEvent(eventId, medicalId, 2);
                }
                log.info("Attached disclosures to event: {}", eventId);
            }
        }

        log.info("Default disclosures seeded successfully");
    }
}
