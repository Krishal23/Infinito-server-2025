import mongoose from "mongoose";

// -------------------- Validation Helpers --------------------
const validateAadhar = v => /^\d{12}$/.test(v);
const validatePhone = v => /^\d{10}$/.test(v);

// Centralized team size rules
const TEAM_LIMITS = {
    basketball: { min: 5, max: 12 },
    cricket: { min: 11, max: 16 },
    football: { min: 11, max: 16 },
    kabaddi: { min: 7, max: 10 },
    volleyball: { min: 6, max: 12 },
    chess: { min: 1, max: 2 },
    badminton: { min: 1, max: 2 },
    table_tennis: { min: 1, max: 2 },
    lawn_tennis: { min: 1, max: 2 },
    squash: { min: 1, max: 1 },
    weight_lifting: { min: 1, max: 1 },
    athletics: { min: 1, max: 1 }
  };

// -------------------- Common Base Fields --------------------
const baseEventFields = {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    aadharId: {
      type: String,
      trim: true,
      required: [true, "Aadhar ID is required"],
      // validate: { validator: validateAadhar, message: "Aadhar ID must be 12 digits" }
    },
    leadName: { type: String,required:true,  trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      // validate: { validator: validatePhone, message: "Phone number must be 10 digits" }
    },

    //for lead optional
    collegeDetails:{
      collegeName: { type: String, trim: true },
      collegeAddress: { type: String, trim: true },
      rollNo: { type: String, trim: true },
    },
  
    // Registration meta
    registrationDate: { type: Date, default: Date.now },
  
    // Payment quick refs
    paymentStatus: { type: String, enum: ["pending","paid","failed","refunded"], default: "pending" },
    paymentOrderId: { type: String, trim: true },
    paymentId:      { type: String, trim: true },
    paymentSignature:{ type: String, trim: true },

  
  
    // Reference to central Transaction table
    transaction: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
  
    registrationFee: { type: Number, default: 0 },
  };
  

// -------------------- Team Member Schema --------------------
const teamMemberSchema = new mongoose.Schema({
  fullname: { type: String,  trim: true },
  email: { type: String,  trim: true, lowercase: true },
  phoneNumber: { type: String, trim: true },
  aadharId: { type: String,  trim: true },
  rollNo: String,
  position: String,
  role: { type: String },
  skillLevel: { type: String }
}, { _id: false });

// -------------------- Team Schema --------------------
const teamSchema = new mongoose.Schema({
  teamName: String,
  leaderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  members: [teamMemberSchema],
}, { _id: false });

// -------------------- Schema Factory --------------------
function createSchema(fields, { uniqueByUser = true, esports = false } = {}) {
    let schemaFields = { ...baseEventFields, ...fields };
  
    // For esports, drop redundant base fields
    if (esports) {
      delete schemaFields.leadName;
      delete schemaFields.email;
      delete schemaFields.phoneNumber;
      delete schemaFields.aadharId;
      delete schemaFields.collegeName;
      delete schemaFields.collegeDetails;  
      delete schemaFields.coachDetails;     
    }
  
    const schema = new mongoose.Schema(schemaFields, {
      timestamps: true,
      toJSON: { virtuals: true },
      toObject: { virtuals: true }
    });
  
    if (uniqueByUser) schema.index({ userId: 1 }, { unique: true });
    return schema;
  }
  
  // -------------------- Esports Player Schema --------------------
  const esportsPlayerSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    contactNumber: { 
      type: String, 
      // required: true, 
      // validate: { validator: validatePhone, message: "Phone must be 10 digits" }
    },
    aadharId: { 
      type: String, 
      required: true, 
      trim: true, 
      // validate: { validator: validateAadhar, message: "Aadhar ID must be 12 digits" }
    },
    ign: { type: String, required: true, trim: true }
  }, { _id: false });
  


  // -------------------- Esports Schema Factory --------------------
  function createEsportsSchema(gameName) {
    const schema = createSchema({
      teamName: { type: String, required: true, trim: true },
      teamLeader: {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, trim: true, lowercase: true },
        contactNumber: { 
          type: String, 
          required: true, 
          // validate: { validator: validatePhone, message: "Phone must be 10 digits" }
        },
        aadharId: { 
          type: String, 
          required: true, 
          trim: true, 
          // validate: { validator: validateAadhar, message: "Aadhar ID must be 12 digits" }
        },
        ign: { type: String, required: true, trim: true },
        collegeId: { type: String, trim: true },
        collegeName: { type: String, trim: true },
        collegeAddress: { type: String, trim: true }
      },
  
      players: {
        type: [esportsPlayerSchema],
        // validate: {
        //   validator: arr => Array.isArray(arr) && arr.length === 4,
        //   message: "Exactly 4 players required besides the leader"
        // }
      },
  
      queries: { type: String, maxlength: 500 }
    }, { esports: true });
  
    // schema.pre("validate", function(next) {
    //   if (!this.players || this.players.length !== 4) {
    //     this.invalidate("players", `${gameName} team must have exactly 4 players (excluding leader)`);
    //   }
    //   next();
    // });
  
    return schema;
  }
  
// -------------------- Event Schemas --------------------

// 1. Athletics
const athleticsSchema = createSchema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  coach: {
    fullname: { type: String},
    email: { type: String },
    phoneNumber: { type: String },
    aadharId: { type: String }

  },

  category: { type: String, enum: ["men", "women"], required: true },
  individualEvents: { type: [String], default: [] },
  relayTeams: [teamSchema],
});

// 2. Badminton
const BadmintonRegistrationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  captain: { type: teamMemberSchema, required: true },
  viceCaptain: { type: teamMemberSchema, required: true },
  players: { type: [teamMemberSchema], validate: v => v.length === 3 },
  collegeName: { type: String },
  collegeAddress: { type: String },
  coach: {
    fullname: { type: String},
    email: { type: String },
    phoneNumber: { type: String },
    aadharId: { type: String }

  },
  category: { type: String, enum: ["Men", "Women"], required: true },
  
  // Payment quick refs
  paymentStatus: { type: String, enum: ["pending","paid","failed","refunded"], default: "pending" },
  paymentOrderId: { type: String, trim: true },
  paymentId:      { type: String, trim: true },
  paymentSignature:{ type: String, trim: true },

  // Reference to central Transaction table
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
  registrationDate: { type: Date, default: Date.now },
}, { timestamps: true });

// 3. Basketball
const BasketballRegistrationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  category: { type: String, enum: ["Men", "Women"], required: true },
  
  collegeName: { type: String},
  collegeAddress: { type: String },

  captain: { type: teamMemberSchema, required: true },
  viceCaptain: { type: teamMemberSchema, required: true },

  players: { 
    type: [teamMemberSchema], 
  },

  substitutes: { 
    type: [teamMemberSchema], 
  },

  coach: {
    fullname: { type: String},
    email: { type: String },
    phoneNumber: { type: String },
    aadharId: { type: String }

  },

  // Payment quick refs
  paymentStatus: { type: String, enum: ["pending","paid","failed","refunded"], default: "pending" },
  paymentOrderId: { type: String, trim: true },
  paymentId:      { type: String, trim: true },
  paymentSignature:{ type: String, trim: true },

  // Reference to central Transaction table
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
  registrationDate: { type: Date, default: Date.now },
}, { timestamps: true });



// 2. chess
const chessSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  captain: { type: teamMemberSchema, required: true },
  players: { type: [teamMemberSchema]},
  collegeName: { type: String },
  collegeAddress: { type: String },
  coach: {
    fullname: { type: String},
    email: { type: String },
    phoneNumber: { type: String },
    aadharId: { type: String }

  },
  
  // Payment quick refs
  paymentStatus: { type: String, enum: ["pending","paid","failed","refunded"], default: "pending" },
  paymentOrderId: { type: String, trim: true },
  paymentId:      { type: String, trim: true },
  paymentSignature:{ type: String, trim: true },

  // Reference to central Transaction table
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
  registrationDate: { type: Date, default: Date.now },
}, { timestamps: true });


// 5. Cricket
const CricketRegistrationSchema = new mongoose.Schema({
  // category: { type: String, enum: ["Men", "Women"], required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  collegeName: { type: String },
  collegeAddress: { type: String },

  captain: { type: teamMemberSchema, required: true },
  viceCaptain: { type: teamMemberSchema, required: true },

  players: {
    type: [teamMemberSchema],
    required: true,
  },

  coach: {
    fullname: { type: String},
    email: { type: String },
    phoneNumber: { type: String },
    aadharId: { type: String }

  },

  // Payment quick refs
  paymentStatus: { type: String, enum: ["pending","paid","failed","refunded"], default: "pending" },
  paymentOrderId: { type: String, trim: true },
  paymentId: { type: String, trim: true },
  paymentSignature: { type: String, trim: true },

  // Reference to central Transaction table
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
  registrationDate: { type: Date, default: Date.now },
}, { timestamps: true });



const FootballRegistrationSchema = new mongoose.Schema({
  // category: { type: String, enum: ["Men", "Women"], required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },


  collegeName: { type: String },
  collegeAddress: { type: String },

  captain: { type: teamMemberSchema, required: true },
  viceCaptain: { type: teamMemberSchema, required: true },

  players: {
    type: [teamMemberSchema],
    required: true,
  },

  coach: {
    fullname: { type: String},
    email: { type: String },
    phoneNumber: { type: String },
    aadharId: { type: String }
  },

  // Payment quick refs
  paymentStatus: { type: String, enum: ["pending","paid","failed","refunded"], default: "pending" },
  paymentOrderId: { type: String, trim: true },
  paymentId: { type: String, trim: true },
  paymentSignature: { type: String, trim: true },

  // Reference to central Transaction table
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
  registrationDate: { type: Date, default: Date.now },
}, { timestamps: true });




// 7. Kabaddi

const KabaddiRegistrationSchema = new mongoose.Schema({
  category: { type: String, enum: ["Men", "Women"], required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  
  collegeName: { type: String},
  collegeAddress: { type: String },

  captain: { type: teamMemberSchema, required: true },
  viceCaptain: { type: teamMemberSchema, required: true },

  players: { 
    type: [teamMemberSchema], 
  },

  substitutes: { 
    type: [teamMemberSchema], 
  },

  coach: {
    fullname: { type: String},
    email: { type: String },
    phoneNumber: { type: String },
    aadharId: { type: String }

  },

  // Payment quick refs
  paymentStatus: { type: String, enum: ["pending","paid","failed","refunded"], default: "pending" },
  paymentOrderId: { type: String, trim: true },
  paymentId:      { type: String, trim: true },
  paymentSignature:{ type: String, trim: true },

  // Reference to central Transaction table
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
  registrationDate: { type: Date, default: Date.now },
}, { timestamps: true });


// 8. Lawn Tennis
const lawnTennisSchema = new mongoose.Schema({
  category: { type: String, enum: ["Men", "Women"], required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  
  collegeName: { type: String},
  collegeAddress: { type: String },
  players: { 
    type: [teamMemberSchema], 
  },

  coach: {
    fullname: { type: String},
    email: { type: String },
    phoneNumber: { type: String },
    aadharId: { type: String }

  },

  // Payment quick refs
  paymentStatus: { type: String, enum: ["pending","paid","failed","refunded"], default: "pending" },
  paymentOrderId: { type: String, trim: true },
  paymentId:      { type: String, trim: true },
  paymentSignature:{ type: String, trim: true },

  // Reference to central Transaction table
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
  registrationDate: { type: Date, default: Date.now },
});

// 9. Squash

const squashSchema = new mongoose.Schema({
  category: { type: String, enum: ["Men", "Women"], required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  
  collegeName: { type: String},
  collegeAddress: { type: String },
  players: { 
    type: [teamMemberSchema], 
  },

  coach: {
    fullname: { type: String},
    email: { type: String },
    phoneNumber: { type: String },
    aadharId: { type: String }

  },

  // Payment quick refs
  paymentStatus: { type: String, enum: ["pending","paid","failed","refunded"], default: "pending" },
  paymentOrderId: { type: String, trim: true },
  paymentId:      { type: String, trim: true },
  paymentSignature:{ type: String, trim: true },

  // Reference to central Transaction table
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
  registrationDate: { type: Date, default: Date.now },
});


// 10. Table Tennis

const tableTennisSchema = new mongoose.Schema({
  category: { type: String, enum: ["Men", "Women"], required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  
  collegeName: { type: String},
  collegeAddress: { type: String },

  captain: { type: teamMemberSchema, required: true },

  players: { 
    type: [teamMemberSchema], 
  },

  coach: {
    fullname: { type: String},
    email: { type: String },
    phoneNumber: { type: String },
    aadharId: { type: String }
  },

  // Payment quick refs
  paymentStatus: { type: String, enum: ["pending","paid","failed","refunded"], default: "pending" },
  paymentOrderId: { type: String, trim: true },
  paymentId:      { type: String, trim: true },
  paymentSignature:{ type: String, trim: true },

  // Reference to central Transaction table
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
  registrationDate: { type: Date, default: Date.now },
}, { timestamps: true });



// 11. Volleyball

const volleyballSchema = new mongoose.Schema({
  category: { type: String, enum: ["Men", "Women"], required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  
  collegeName: { type: String},
  collegeAddress: { type: String },

  captain: { type: teamMemberSchema, required: true },
  viceCaptain: { type: teamMemberSchema, required: true },

  players: { 
    type: [teamMemberSchema], 
  },

  substitutes: { 
    type: [teamMemberSchema], 
  },

  coach: {
    fullname: { type: String},
    email: { type: String },
    phoneNumber: { type: String },
    aadharId: { type: String }

  },

  // Payment quick refs
  paymentStatus: { type: String, enum: ["pending","paid","failed","refunded"], default: "pending" },
  paymentOrderId: { type: String, trim: true },
  paymentId:      { type: String, trim: true },
  paymentSignature:{ type: String, trim: true },

  // Reference to central Transaction table
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
  registrationDate: { type: Date, default: Date.now },
}, { timestamps: true });

// 12. Weight Lifting

const weightLiftingSchema = new mongoose.Schema({
  // category: { type: String, enum: ["Men", "Women"], required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  
  collegeName: { type: String},
  collegeAddress: { type: String },
  players: { 
    type: teamMemberSchema, 
  },

  coach: {
    fullname: { type: String},
    email: { type: String },
    phoneNumber: { type: String },
    aadharId: { type: String }

  },

  // Payment quick refs
  paymentStatus: { type: String, enum: ["pending","paid","failed","refunded"], default: "pending" },
  paymentOrderId: { type: String, trim: true },
  paymentId:      { type: String, trim: true },
  paymentSignature:{ type: String, trim: true },

  // Reference to central Transaction table
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
  registrationDate: { type: Date, default: Date.now },
});

const powerLiftingSchema = new mongoose.Schema({
  // category: { type: String, enum: ["Men", "Women"], required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  collegeName: { type: String},
  collegeAddress: { type: String },
  players: { 
    type: teamMemberSchema, 
  },

  coach: {
    fullname: { type: String},
    email: { type: String },
    phoneNumber: { type: String },
    aadharId: { type: String }

  },

  // Payment quick refs
  paymentStatus: { type: String, enum: ["pending","paid","failed","refunded"], default: "pending" },
  paymentOrderId: { type: String, trim: true },
  paymentId:      { type: String, trim: true },
  paymentSignature:{ type: String, trim: true },

  // Reference to central Transaction table
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
  registrationDate: { type: Date, default: Date.now },
});



 



// -------------------- Exports --------------------
export const AthleticsRegistration = mongoose.model("AthleticsRegistration", athleticsSchema);
export const BadmintonRegistration = mongoose.model("BadmintonRegistration", BadmintonRegistrationSchema);
export const BasketballRegistration = mongoose.model("BasketballRegistration", BasketballRegistrationSchema);
export const ChessRegistration = mongoose.model("ChessRegistration", chessSchema);
export const CricketRegistration = mongoose.model("CricketRegistration", CricketRegistrationSchema);
export const FootballRegistration = mongoose.model("FootballRegistration", FootballRegistrationSchema);
export const KabaddiRegistration = mongoose.model("KabaddiRegistration", KabaddiRegistrationSchema);
export const LawnTennisRegistration = mongoose.model("LawnTennisRegistration", lawnTennisSchema);
export const SquashRegistration = mongoose.model("SquashRegistration", squashSchema);
export const TableTennisRegistration = mongoose.model("TableTennisRegistration", tableTennisSchema);
export const VolleyballRegistration = mongoose.model("VolleyballRegistration", volleyballSchema);
export const WeightLiftingRegistration = mongoose.model("WeightLiftingRegistration", weightLiftingSchema);
export const PowerLiftingRegistration = mongoose.model("PowerLiftingRegistration", powerLiftingSchema);
export const BGMIRegistration = mongoose.model("BGMIRegistration", createEsportsSchema("BGMI"));
export const FreeFireRegistration = mongoose.model("FreeFireRegistration", createEsportsSchema("FreeFire"));
export const CODMRegistration = mongoose.model("CODMRegistration", createEsportsSchema("CODM"));
export const ValorantRegistration = mongoose.model("ValorantRegistration", createEsportsSchema("Valorant"));
export const ClashRoyaleRegistration = mongoose.model("ClashRoyaleRegistration", createEsportsSchema("ClashRoyale"));


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
  weight_lifting: WeightLiftingRegistration,
  power_lifting: PowerLiftingRegistration,
  bgmi: BGMIRegistration,
  freefire: FreeFireRegistration,
  codm: CODMRegistration,
  valorant: ValorantRegistration,
  clash_royale:ClashRoyaleRegistration

};
