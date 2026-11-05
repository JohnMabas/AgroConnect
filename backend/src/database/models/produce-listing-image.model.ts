import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../sequelize.js";

// Immutable record — no updated_at column. timestamps: false prevents
// Sequelize from attempting to manage updatedAt automatically.

export class ProduceListingImage extends Model<
  InferAttributes<ProduceListingImage>,
  InferCreationAttributes<ProduceListingImage>
> {
  declare id: CreationOptional<string>;
  declare listing_id: string;
  declare image_url: string;
  declare storage_key: CreationOptional<string | null>;
  declare is_primary: CreationOptional<boolean>;
  declare display_order: CreationOptional<number>;
  declare created_at: CreationOptional<Date>;
}

ProduceListingImage.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    listing_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    image_url: {
      type: DataTypes.STRING(512),
      allowNull: false,
    },
    storage_key: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    is_primary: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    display_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "produce_listing_images",
    modelName: "ProduceListingImage",
    underscored: true,
    timestamps: false,
  },
);
