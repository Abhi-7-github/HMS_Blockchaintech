/**
 * Rural Health & Wellness Knowledge Base & ASHA Worker Directory
 */
const RURAL_WELLNESS_CATEGORIES = {
    specialistGuidance: [
        {
            category: "Primary Health Center (PHC / CHC)",
            description: "First contact for fever, minor injuries, maternal checkups, and vaccinations.",
            recommendedContact: "ASHA Worker / ANM Nurse",
        },
        {
            category: "General Physician",
            description: "Persistent fever, cough, digestive troubles, fatigue, or body pain.",
            recommendedContact: "MBBS Medical Officer at Block CHC",
        },
        {
            category: "Gynecologist & Obstetrician",
            description: "Pregnancy care, antenatal checkups, reproductive health, and anemia management.",
            recommendedContact: "Maternal Health Clinic at District Hospital",
        },
        {
            category: "Pediatrician",
            description: "Childhood immunizations, infant nutrition, fever, and growth monitoring.",
            recommendedContact: "Anganwadi Center / Child Specialist",
        },
    ],
    ayurvedicWellness: [
        {
            title: "Traditional Herbal Wellness (हर्बल कल्याण / மூலிகை சுகாதாரம்)",
            items: [
                { name: "Turmeric (Haldi / மஞ்சள்)", benefits: "Natural antioxidant and immune system support. Boil in warm milk or water." },
                { name: "Tulsi (Holy Basil / துளசி)", benefits: "Supports respiratory health and seasonal cough relief when brewed as tea." },
                { name: "Ginger (Adrak / இஞ்சி)", benefits: "Aids digestive comfort, nausea relief, and warm circulation." },
                { name: "Ashwagandha (அஸ்வகந்தா)", benefits: "Traditional adaptogen supporting vitality and stress resilience." },
            ],
            disclaimer: "Ayurvedic wellness practices are for general lifestyle support and do not replace prescribed medical drugs.",
        },
    ],
    nutritionGuidance: [
        {
            title: "Traditional Nutritious Diet & Anemia Prevention",
            recommendations: [
                "Incorporate native millets (Ragi, Jowar, Bajra) rich in dietary fiber, calcium, and iron.",
                "Consume local green leafy vegetables (Spinach, Moringa / Drumstick leaves) for natural iron.",
                "Pair iron-rich foods with vitamin C (Lemon, Amla) to enhance absorption.",
                "Ensure clean drinking water by boiling or using earthenware filtration.",
            ],
        },
    ],
    yogaGuidance: [
        {
            title: "Daily Yoga & Pranayama Routine",
            practices: [
                { name: "Anulom Vilom (Alternate Nostril Breathing)", duration: "5-10 mins", purpose: "Calms nervous system and improves lung airflow." },
                { name: "Kapalbhati (Breath of Fire)", duration: "3-5 mins", purpose: "Enhances metabolic energy and core engagement." },
                { name: "Surya Namaskar (Sun Salutations)", duration: "5-12 rounds", purpose: "Full body flexibility, joint strength, and cardiovascular health." },
                { name: "Bhramari (Humming Bee Breathing)", duration: "3-5 mins", purpose: "Relieves mental fatigue and promotes restful sleep." },
            ],
        },
    ],
    healthyLifestyle: [
        {
            title: "Preventive Hygiene & Daily Habits",
            habits: [
                "Wash hands thoroughly with soap before meals and after sanitation.",
                "Prevent stagnant water accumulation near homes to avoid mosquito breeding (Dengue/Malaria).",
                "Maintain 7-8 hours of restful sleep every night.",
                "Avoid tobacco, gutka, and alcohol to protect heart and liver health.",
            ],
        },
    ],
    ashaWorkerDirectory: [
        {
            region: "Rural Health Sub-Center Node 1",
            contactPerson: "Sunita Devi (ASHA Coordinator)",
            phone: "+91 98765 43210",
            services: "Antenatal Care, Immunization, ORS Distribution, Maternal Referral",
        },
        {
            region: "Rural Health Sub-Center Node 2",
            contactPerson: "Rajeshwari Ammal (ANM Health Worker)",
            phone: "+91 98765 43211",
            services: "TB Screening, Nutrition Counseling, Emergency First Aid",
        },
    ],
};

/**
 * @desc    Get Rural Healthcare Knowledge Base & Directory
 * @route   GET /api/rural/wellness
 * @access  Public / Authenticated
 */
const getRuralWellnessData = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            disclaimer: "⚠️ General Wellness Disclaimer: This information is for general health literacy and wellness education only. It does NOT constitute a medical diagnosis or treatment plan.",
            data: RURAL_WELLNESS_CATEGORIES,
        });
    } catch (error) {
        console.error("Error fetching rural wellness data:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching rural wellness data",
        });
    }
};

module.exports = {
    getRuralWellnessData,
};
