
export function buildPlayerTxt(registrationData, eventKey) {
    let content = `Infinito 2025 - ${eventKey.toUpperCase()} Registration\n\n`;

    if (registrationData.collegeName) {
        content += `College: ${registrationData.collegeName}\n`;
    }
    if (registrationData.collegeAddress) {
        content += `Address: ${registrationData.collegeAddress}\n`;
    }
    if (registrationData.category) {
        content += `Category: ${registrationData.category}\n\n`;
    }

    // Captain
    if (registrationData.captain) {
        content += `Captain:\n  Name: ${registrationData.captain.fullname}\n  Email: ${registrationData.captain.email}\n  Phone: ${registrationData.captain.phoneNumber}\n  Aadhar: ${registrationData.captain.aadharId}\n\n`;
    }

    // Players
    if (registrationData.players && registrationData.players.length) {
        content += "Players:\n";
        registrationData.players.forEach((p, idx) => {
            content += `  ${idx + 1}. ${p.fullname} | ${p.email} | ${p.phoneNumber}\n`;
        });
        content += "\n";
    }

    // Vice-Captain if present
    if (registrationData.viceCaptain) {
        content += `Vice-Captain:\n  Name: ${registrationData.viceCaptain.fullname}\n  Email: ${registrationData.viceCaptain.email}\n\n`;
    }

    // Coach if present
    if (registrationData.coach) {
        content += `Coach:\n  Name: ${registrationData.coach.fullname}\n  Email: ${registrationData.coach.email}\n  Phone: ${registrationData.coach.phoneNumber}\n\n`;
    }

    return content;
}