import mongoose from "mongoose";


const baseEventFields = {
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        aadharId: {
            type: String,
            trim: true,
            required: [true, "Aadhar ID is required"],
            validate: [
                {
                    validator: function (v) {
                        return /^\d{12}$/.test(v);
                    },
                    message: "Aadhar ID must be exactly 12 digits"
                }
            ]
        }, ed: false
    },
    username: {
        type: String,
        required: false,
        trim: true,
        lowercase: true
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        lowercase: true,
        trim: true
    },
    fullname: {
        type: String,
        required: [true, "Full name is required"],
        trim: true
    },
    collegeName: {
        type: String,
        required: [true, "College name is required"],
        trim: true
    },
    rollNo: {
        type: String,
        required: false,
        trim: true
    },
    phoneNumber: {
        type: String,
        required: false,
        trim: true,
        validate: {
            validator: function (v) {
                return !v || /^\d{10}$/.test(v);
            },
            message: "Phone number must be 10 digits"
        }
    },

    emergencyContact: {
        name: {
            type: String,
            required: false,
            trim: true
        },
        relation: {
            type: String,
            required: false,
            trim: true
        },
        phoneNumber: {
            type: String,
            required: false,
            trim: true,
            validate: {
                validator: function (v) {
                    return !v || /^\d{10}$/.test(v);
                },
                message: "Emergency contact phone must be 10 digits"
            }
        }
    },

    medicalInfo: {
        allergies: {
            type: String,
            trim: true,
            default: "None"
        },
        medications: {
            type: String,
            trim: true,
            default: "None"
        },
        medicalConditions: {
            type: String,
            trim: true,
            default: "None"
        },
        bloodGroup: {
            type: String,
            enum: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-", "Unknown"],
            default: "Unknown"
        }
    },

    registrationDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ["pending", "confirmed", "cancelled", "waitlisted"],
        default: "pending"
    },
    paymentStatus: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
        default: "pending"
    },
    registrationFee: {
        type: Number,
        default: 0
    },

    parentalConsent: {
        type: Boolean,
        required: false
    },
    liabilityWaiver: {
        type: Boolean,
        required: false
    },

    additionalNotes: {
        type: String,
        trim: true,
        maxlength: 500
    }
};

// Shared team sub-schemas (used for team sports)
const teamMemberSchema = new mongoose.Schema({
    fullname: { type: String, trim: true, required: [true, "Member full name is required"] },
    email: { type: String, trim: true, lowercase: true, required: [true, "Email is required"] },
    phoneNumber: {
        type: String,
        trim: true,
        required: [true, "Phone number is required"],
        validate: {
            validator: function (v) { return /^\d{10}$/.test(v); },
            message: "Phone number must be exactly 10 digits"
        }
    },
    collegeName: { type: String, trim: true },
    collegeId: { type: String, trim: true },
    aadharId: {
        type: String,
        trim: true,
        required: [true, "Aadhar ID is required"],
        validate: {
            validator: function (v) {
                return /^\d{12}$/.test(v);
            },
            message: "Aadhar ID must be 12 digits"
        }
    },
    rollNo: { type: String, trim: true },
    position: { type: String, trim: true }, // e.g., defender, setter, etc.
    role: {
        type: String,
        trim: true,
        required: [true, "Role is required"],
        enum: ["Captain", "Vice Captain", "Player"]
    },
    rating: { type: String, trim: true }, // For chess, badminton, etc.
    height: { type: String, trim: true }, // For basketball, volleyball
    weight: { type: String, trim: true }, // For weightlifting, kabaddi
    playingStyle: { type: String, trim: true }, // For cricket, table tennis
    skillLevel: {
        type: String,
        enum: ["beginner", "intermediate", "advanced", "professional"]
    }
}, { _id: false });

const teamSchema = new mongoose.Schema({
    teamName: { type: String, trim: true },
    leaderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    teamSize: { type: Number, min: 1 },
    members: {
        type: [teamMemberSchema],
        default: [],
        validate: [
            {
                validator: function (arr) {
                    if (!Array.isArray(arr)) return false;

                    const eventLimits = {
                        basketballregistration: { min: 5, max: 12 },
                        cricketregistration: { min: 11, max: 16 },
                        footballregistration: { min: 11, max: 16 },
                        kabaddiregistration: { min: 7, max: 10 },
                        volleyballregistration: { min: 6, max: 12 },
                        chessregistration: { min: 1, max: 2 },
                        badmintonregistration: { min: 1, max: 2 },
                        tabletennisregistration: { min: 1, max: 2 },
                        lawntennisregistration: { min: 1, max: 2 },
                        squashregistration: { min: 1, max: 1 },
                        weightliftingregistration: { min: 1, max: 1 },
                        athleticsregistration: { min: 1, max: 1 }
                    };

                    // Get model name from parent document
                    let modelName;
                    try {
                        modelName = this.ownerDocument().constructor.modelName.toLowerCase();
                    } catch (e) {
                        modelName = '';
                    }

                    const limits = eventLimits[modelName] || { min: 1, max: 1 };
                    return arr.length >= limits.min && arr.length <= limits.max;
                },
                message: function () {
                    const eventLimits = {
                        basketballregistration: { min: 5, max: 12 },
                        cricketregistration: { min: 11, max: 16 },
                        footballregistration: { min: 11, max: 16 },
                        kabaddiregistration: { min: 7, max: 10 },
                        volleyballregistration: { min: 6, max: 12 },
                        chessregistration: { min: 1, max: 2 },
                        badmintonregistration: { min: 1, max: 2 },
                        tabletennisregistration: { min: 1, max: 2 },
                        lawntennisregistration: { min: 1, max: 2 },
                        squashregistration: { min: 1, max: 1 },
                        weightliftingregistration: { min: 1, max: 1 },
                        athleticsregistration: { min: 1, max: 1 }
                    };

                    let modelName;
                    try {
                        modelName = this.ownerDocument().constructor.modelName.toLowerCase();
                    } catch (e) {
                        modelName = '';
                    }

                    const limits = eventLimits[modelName] || { min: 1, max: 1 };
                    return `Team must have between ${limits.min} and ${limits.max} members`;
                }
            }
        ]
    },
    note: { type: String, trim: true, maxlength: 300 }
}, { _id: false });

// 1. Athletics Registration Model
const athleticsSchema = new mongoose.Schema({
    ...baseEventFields,

    events: [{
        type: String,
        enum: [
            "100m", "200m", "400m", "800m", "1500m", "3000m", "5000m", "10000m",
            "110m_hurdles", "400m_hurdles", "3000m_steeplechase",
            "high_jump", "pole_vault", "long_jump", "triple_jump",
            "shot_put", "discus_throw", "hammer_throw", "javelin_throw",
            "decathlon", "heptathlon", "4x100m_relay", "4x400m_relay"
        ],
        required: [true, "At least one event must be selected"]
    }],

    category: {
        type: String,
        enum: ["men", "women"],
        required: [true, "Category is required"]
    },

    // experience: {
    //     type: String,
    //     enum: ["beginner", "intermediate", "advanced", "professional"],
    //     required: [true, "Experience level is required"]
    // },

    // personalBest: {
    //     type: String,
    //     trim: true,
    //     maxlength: 200
    // },

    coachName: {
        type: String,
        trim: true
    },

    // tShirtSize: {
    //     type: String,
    //     enum: ["XS", "S", "M", "L", "XL", "XXL"],
    //     required: [true, "T-shirt size is required"]
    // }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

athleticsSchema.index({ userId: 1 }, { unique: true });

// 2. Badminton Registration Model
const badmintonSchema = new mongoose.Schema({
    ...baseEventFields,

    category: {
        type: String,
        enum: ["men_singles", "women_singles", "men_doubles", "women_doubles", "mixed_doubles"],
        required: false
    },

    partnerDetails: {
        name: String,
        email: String,
        phoneNumber: String,
        collegeName: String,
        rollNo: String
    },

    skillLevel: {
        type: String,
        enum: ["beginner", "intermediate", "advanced", "professional"],
        required: false
    },

    playingHand: {
        type: String,
        enum: ["right", "left", "ambidextrous"],
        required: false
    },

    // racketBrand: {
    //     type: String,
    //     trim: true
    // },

    previousTournaments: {
        type: String,
        trim: true,
        maxlength: 300
    },

    // tShirtSize: {
    //     type: String,
    //     enum: ["XS", "S", "M", "L", "XL", "XXL"],
    //     required: [true, "T-shirt size is required"]
    // }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

badmintonSchema.index({ userId: 1 }, { unique: true });

// 3. Basketball Registration Model
const basketballSchema = new mongoose.Schema({
    ...baseEventFields,

    category: {
        type: String,
        enum: ["men", "women"],
        required: [true, "Category is required"]
    },

    position: {
        type: String,
        enum: ["point_guard", "shooting_guard", "small_forward", "power_forward", "center", "any"],
        required: [true, "Position is required"]
    },

    height: {
        type: String,
        required: [true, "Height is required"]
    },

    experience: {
        type: String,
        enum: ["beginner", "intermediate", "advanced", "professional"],
        required: [true, "Experience level is required"]
    },

    // teamPreference: {
    //     type: String,
    //     enum: ["create_new", "join_existing", "no_preference"],
    //     required: [true, "Team preference is required"]
    // },

    teamName: {
        type: String,
        trim: true
    },

    // jerseySize: {
    //     type: String,
    //     enum: ["XS", "S", "M", "L", "XL", "XXL"],
    //     required: [true, "Jersey size is required"]
    // },

    // shoeSize: {
    //     type: String,
    //     required: [true, "Shoe size is required"]
    // },

    // Optional team block
    team: teamSchema
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

basketballSchema.index({ userId: 1 }, { unique: true });

// 4. Chess Registration Model
const chessSchema = new mongoose.Schema({
    ...baseEventFields,

    category: {
        type: String,
        enum: ["open", "women", "under_18", "under_16"],
        required: [true, "Category is required"]
    },

    fideRating: {
        type: Number,
        min: 0,
        max: 3000
    },

    onlineRatings: {
        chesscom: {
            username: String,
            rating: Number
        },
        lichess: {
            username: String,
            rating: Number
        }
    },

    experience: {
        type: String,
        enum: ["beginner", "club_player", "tournament_player", "expert", "master"],
        required: [true, "Experience level is required"]
    },

    preferredTimeControl: {
        type: String,
        enum: ["blitz", "rapid", "classical"],
        required: [true, "Preferred time control is required"]
    },

    previousTournaments: {
        type: String,
        trim: true,
        maxlength: 400
    },

    // tShirtSize: {
    //     type: String,
    //     enum: ["XS", "S", "M", "L", "XL", "XXL"],
    //     required: [true, "T-shirt size is required"]
    // }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

chessSchema.index({ userId: 1 }, { unique: true });

// 5. Cricket Registration Model
const cricketSchema = new mongoose.Schema({
    ...baseEventFields,

    category: {
        type: String,
        enum: ["men", "women"],
        required: [true, "Category is required"]
    },

    role: {
        type: String,
        enum: ["batsman", "bowler", "wicket_keeper", "all_rounder"],
        required: [true, "Playing role is required"]
    },

    battingStyle: {
        type: String,
        enum: ["right_handed", "left_handed"]
    },

    // bowlingStyle: {
    //     type: String,
    //     enum: ["right_arm_fast", "left_arm_fast", "right_arm_medium", "left_arm_medium",
    //         "right_arm_spin", "left_arm_spin", "leg_spin", "off_spin"]
    // },

    // teamPreference: {
    //     type: String,
    //     enum: ["create_new", "join_existing", "no_preference"],
    //     required: [true, "Team preference is required"]
    // },

    teamName: {
        type: String,
        trim: true
    },

    // jerseySize: {
    //     type: String,
    //     enum: ["XS", "S", "M", "L", "XL", "XXL"],
    //     required: [true, "Jersey size is required"]
    // },

    // experience: {
    //     type: String,
    //     enum: ["beginner", "intermediate", "advanced", "professional"],
    //     required: [true, "Experience level is required"]
    // },

    // Optional team block
    team: teamSchema
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

cricketSchema.index({ userId: 1 }, { unique: true });

// 6. Football Registration Model
const footballSchema = new mongoose.Schema({
    ...baseEventFields,

    category: {
        type: String,
        enum: ["men", "women"],
        required: [true, "Category is required"]
    },

    position: {
        type: String,
        enum: ["goalkeeper", "defender", "midfielder", "forward", "any"],
        required: [true, "Position is required"]
    },

    // preferredFoot: {
    //     type: String,
    //     enum: ["right", "left", "both"],
    //     required: [true, "Preferred foot is required"]
    // },

    // teamPreference: {
    //     type: String,
    //     enum: ["create_new", "join_existing", "no_preference"],
    //     required: [true, "Team preference is required"]
    // },

    teamName: {
        type: String,
        trim: true
    },

    // jerseySize: {
    //     type: String,
    //     enum: ["XS", "S", "M", "L", "XL", "XXL"],
    //     required: [true, "Jersey size is required"]
    // },

    // shoeSize: {
    //     type: String,
    //     required: [true, "Shoe size is required"]
    // },

    experience: {
        type: String,
        enum: ["beginner", "intermediate", "advanced", "professional"],
        required: [true, "Experience level is required"]
    },

    // Optional team block
    team: teamSchema
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

footballSchema.index({ userId: 1 }, { unique: true });

// 7. Kabaddi Registration Model
const kabaddiSchema = new mongoose.Schema({
    ...baseEventFields,

    category: {
        type: String,
        enum: ["men", "women"],
        required: [true, "Category is required"]
    },

    // weight: {
    //     type: Number,
    //     required: [true, "Weight is required"],
    //     min: 30,
    //     max: 150
    // },

    height: {
        type: String,
        required: [true, "Height is required"]
    },

    position: {
        type: String,
        enum: ["raider", "defender", "all_rounder"],
        required: [true, "Position is required"]
    },

    // teamPreference: {
    //     type: String,
    //     enum: ["create_new", "join_existing", "no_preference"],
    //     required: [true, "Team preference is required"]
    // },

    teamName: {
        type: String,
        trim: true
    },

    experience: {
        type: String,
        enum: ["beginner", "intermediate", "advanced", "professional"],
        required: [true, "Experience level is required"]
    },

    jerseySize: {
        type: String,
        enum: ["XS", "S", "M", "L", "XL", "XXL"],
        required: [true, "Jersey size is required"]
    },

    // Optional team block
    team: teamSchema
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

kabaddiSchema.index({ userId: 1 }, { unique: true });

// 8. Lawn Tennis Registration Model
const lawnTennisSchema = new mongoose.Schema({
    ...baseEventFields,

    category: {
        type: String,
        enum: ["men_singles", "women_singles", "men_doubles", "women_doubles", "mixed_doubles"],
        required: [true, "Category is required"]
    },

    partnerDetails: {
        name: String,
        email: String,
        phoneNumber: String,
        collegeName: String,
        rollNo: String
    },

    skillLevel: {
        type: String,
        enum: ["beginner", "intermediate", "advanced", "professional"],
        required: [true, "Skill level is required"]
    },

    playingHand: {
        type: String,
        enum: ["right", "left", "ambidextrous"],
        required: [true, "Playing hand is required"]
    },

    // racketBrand: {
    //     type: String,
    //     trim: true
    // },

    // preferredSurface: {
    //     type: String,
    //     enum: ["hard_court", "clay_court", "grass_court", "no_preference"],
    //     default: "no_preference"
    // },

    previousTournaments: {
        type: String,
        trim: true,
        maxlength: 300
    },

    // tShirtSize: {
    //     type: String,
    //     enum: ["XS", "S", "M", "L", "XL", "XXL"],
    //     required: [true, "T-shirt size is required"]
    // }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

lawnTennisSchema.index({ userId: 1 }, { unique: true });

// 9. Squash Registration Model
const squashSchema = new mongoose.Schema({
    ...baseEventFields,

    category: {
        type: String,
        enum: ["men", "women"],
        required: [true, "Category is required"]
    },

    skillLevel: {
        type: String,
        enum: ["beginner", "intermediate", "advanced", "professional"],
        required: [true, "Skill level is required"]
    },

    playingHand: {
        type: String,
        enum: ["right", "left", "ambidextrous"],
        required: [true, "Playing hand is required"]
    },

    // racketBrand: {
    //     type: String,
    //     trim: true
    // },

    previousTournaments: {
        type: String,
        trim: true,
        maxlength: 300
    },

    // eyewearRequired: {
    //     type: Boolean,
    //     default: false
    // },

    // tShirtSize: {
    //     type: String,
    //     enum: ["XS", "S", "M", "L", "XL", "XXL"],
    //     required: [true, "T-shirt size is required"]
    // }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

squashSchema.index({ userId: 1 }, { unique: true });

// 10. Table Tennis Registration Model
const tableTennisSchema = new mongoose.Schema({
    ...baseEventFields,

    category: {
        type: String,
        enum: ["men_singles", "women_singles", "men_doubles", "women_doubles", "mixed_doubles"],
        required: [true, "Category is required"]
    },

    partnerDetails: {
        name: String,
        email: String,
        phoneNumber: String,
        collegeName: String,
        rollNo: String
    },

    skillLevel: {
        type: String,
        enum: ["beginner", "intermediate", "advanced", "professional"],
        required: [true, "Skill level is required"]
    },

    // playingHand: {
    //     type: String,
    //     enum: ["right", "left", "ambidextrous"],
    //     required: [true, "Playing hand is required"]
    // },

    playingStyle: {
        type: String,
        enum: ["offensive", "defensive", "all_round", "counter_attack"],
        required: false
    },

    paddleBrand: {
        type: String,
        trim: true
    },

    previousTournaments: {
        type: String,
        trim: true,
        maxlength: 300
    },

    // tShirtSize: {
    //     type: String,
    //     enum: ["XS", "S", "M", "L", "XL", "XXL"],
    //     required: false
    // }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

tableTennisSchema.index({ userId: 1 }, { unique: true });

// 11. Volleyball Registration Model
const volleyballSchema = new mongoose.Schema({
    ...baseEventFields,

    category: {
        type: String,
        enum: ["men", "women"],
        required: [true, "Category is required"]
    },

    position: {
        type: String,
        enum: ["setter", "outside_hitter", "middle_blocker", "opposite", "libero", "universal"],
        required: [true, "Position is required"]
    },

    height: {
        type: String,
        required: [true, "Height is required"]
    },

    // teamPreference: {
    //     type: String,
    //     enum: ["create_new", "join_existing", "no_preference"],
    //     required: [true, "Team preference is required"]
    // },

    teamName: {
        type: String,
        trim: true
    },

    // jerseySize: {
    //     type: String,
    //     enum: ["XS", "S", "M", "L", "XL", "XXL"],
    //     required: [true, "Jersey size is required"]
    // },

    experience: {
        type: String,
        enum: ["beginner", "intermediate", "advanced", "professional"],
        required: [true, "Experience level is required"]
    },

    // Optional team block
    team: teamSchema
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

volleyballSchema.index({ userId: 1 }, { unique: true });

// 12. Weight Lifting Registration Model
const weightLiftingSchema = new mongoose.Schema({
    ...baseEventFields,

    category: {
        type: String,
        enum: ["men", "women"],
        required: [true, "Category is required"]
    },

    competitionType: {
        type: String,
        enum: ["powerlifting", "olympic_weightlifting", "bodybuilding"],
        required: [true, "Competition type is required"]
    },

    weightCategory: {
        type: String,
        enum: ["under_55", "55_61", "61_67", "67_73", "73_81", "81_96", "96_109", "over_109"],
        required: [true, "Weight category is required"]
    },

    currentWeight: {
        type: Number,
        required: [true, "Current weight is required"],
        min: 30,
        max: 200
    },

    events: [{
        type: String,
        enum: ["squat", "bench_press", "deadlift", "snatch", "clean_jerk"],
        required: [true, "At least one event must be selected"]
    }],

    personalBest: {
        squat: Number,
        bench_press: Number,
        deadlift: Number,
        snatch: Number,
        clean_jerk: Number
    },

    experience: {
        type: String,
        enum: ["beginner", "intermediate", "advanced", "professional"],
        required: [true, "Experience level is required"]
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

weightLiftingSchema.index({ userId: 1 }, { unique: true });


export const AthleticsRegistration = mongoose.model("AthleticsRegistration", athleticsSchema);
export const BadmintonRegistration = mongoose.model("BadmintonRegistration", badmintonSchema);
export const BasketballRegistration = mongoose.model("BasketballRegistration", basketballSchema);
export const ChessRegistration = mongoose.model("ChessRegistration", chessSchema);
export const CricketRegistration = mongoose.model("CricketRegistration", cricketSchema);
export const FootballRegistration = mongoose.model("FootballRegistration", footballSchema);
export const KabaddiRegistration = mongoose.model("KabaddiRegistration", kabaddiSchema);
export const LawnTennisRegistration = mongoose.model("LawnTennisRegistration", lawnTennisSchema);
export const SquashRegistration = mongoose.model("SquashRegistration", squashSchema);
export const TableTennisRegistration = mongoose.model("TableTennisRegistration", tableTennisSchema);
export const VolleyballRegistration = mongoose.model("VolleyballRegistration", volleyballSchema);
export const WeightLiftingRegistration = mongoose.model("WeightLiftingRegistration", weightLiftingSchema);


export const EVENT_MODELS = {
    athletics: AthleticsRegistration,
    badminton: BadmintonRegistration,
    basketball: BasketballRegistration,
    chess: ChessRegistration,
    cricket: CricketRegistration,
    football: FootballRegistration,
    kabaddi: KabaddiRegistration,
    lawn_tennis: LawnTennisRegistration,
    squash: SquashRegistration,
    table_tennis: TableTennisRegistration,
    volleyball: VolleyballRegistration,
    weight_lifting: WeightLiftingRegistration
};
