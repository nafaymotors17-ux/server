// models/Purchase.js
const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const aggregatePaginate = require("mongoose-aggregate-paginate-v2");

const purchaseSchema = new mongoose.Schema(
  {
    purchaseDate: {
      type: Date,
      required: [true, "Purchase date is required"],
    },
    auctionNumber: {
      type: Number,
      required: [true, "Auction number is required"],
    },
    maker: {
      type: String,
      required: [true, "Maker is required"],
      trim: true,
    },
    chassisNumber: {
      type: String,
      required: [true, "Chassis number is required"],
      trim: true,
      uppercase: true,
    },
    push: {
      type: Number,
      required: [true, "Push cost is required"],
      min: [0, "Push cost cannot be negative"],
    },
    tax: {
      type: Number,
      required: [true, "Tax is required"],
      min: [0, "Tax cannot be negative"],
    },
    auctionFee: {
      type: Number,
      required: [true, "Auction fee is required"],
      min: [0, "Auction fee cannot be negative"],
    },
    recycle: {
      type: Number,
      default: 0,
      min: [0, "Recycle cost cannot be negative"],
    },
    risko: {
      type: Number,
      default: 0,
      min: [0, "Risk cost cannot be negative"],
    },
    total: {
      type: Number,
      min: [0, "Total cost cannot be negative"],
    },
    soldPrice: {
      type: Number,
      min: [0, "Sold cost cannot be negative"],
    },
    auction: {
      type: String,
      required: [true, "Auction is required"],
      trim: true,
    },
    yard: {
      type: String,
      default: "",
      trim: true,
    },
    loadDate: {
      type: Date,
    },
    ETA: {
      type: Date,
    },
    modelYear: {
      type: String, // Format: "YYYY-MM"
      match: [
        /^\d{4}-\d{2}$/,
        "Please provide a valid model year in YYYY-MM format",
      ],
    },
    expiryDate: {
      type: String, // Format: YYYY-MM
    },

    status: {
      type: String,
      enum: {
        values: [
          "purchased",
          "load_requested",
          "loaded",
          "available",
          "sold",
          "released",
          "expired",
        ],
        message:
          "Status must be one of: purchased, loaded, available, sold, released, expired",
      },
      default: "purchased",
    },
  },
  {
    timestamps: true,
  }
);

// ⭐ Modern Mongoose 7 pre-save middleware (no next())
purchaseSchema.pre("save", function () {
  // calculate total
  this.total =
    this.push +
    this.tax +
    this.auctionFee +
    (this.recycle || 0) +
    (this.risko || 0);

  // calculate expiry date
  if (this.modelYear) {
    const [year, month] = this.modelYear.split("-");
    let expiryYear = parseInt(year) + 10;
    let expiryMonth = parseInt(month) - 1;

    if (expiryMonth < 1) {
      expiryMonth = 12;
      expiryYear -= 1;
    }

    this.expiryDate = `${expiryYear}-${String(expiryMonth).padStart(2, "0")}`;
  }
});

// indexes
purchaseSchema.index({ status: 1 });
purchaseSchema.index({ purchaseDate: -1 });
purchaseSchema.index({ chassisNumber: 1 }, { unique: true });
purchaseSchema.index({ auctionNumber: 1 }, { unique: true });

// ⭐ Enable pagination
purchaseSchema.plugin(mongoosePaginate);
purchaseSchema.plugin(aggregatePaginate);
module.exports = mongoose.model("Purchase", purchaseSchema);
