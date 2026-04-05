package com.vencedores.ski.dto.request;

import lombok.Data;

import java.util.List;

@Data
public class SubmitRegistrationRequest {
    // Personal
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String dob;
    private String city;
    private String state;
    // Emergency
    private String emergencyName;
    private String emergencyPhone;
    private String emergencyRelation;
    // Skill & dietary
    private String skillLevel;
    private String dietary;
    // Medical
    private String medConditions;
    private String conditionDetails;
    private String medAllergies;
    private String allergyDetails;
    private String medMedications;
    private String medicationDetails;
    // Legal
    private boolean liabilityAccepted;
    private boolean medicalAccepted;
    private String signature;
    // Event & payment
    private String eventId;
    private String paymentIntentId;
    private double totalPaid;
    // Disclosure acceptances
    private List<DisclosureAcceptanceInput> disclosureAcceptances;
}
