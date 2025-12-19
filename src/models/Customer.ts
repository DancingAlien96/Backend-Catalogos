import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { Store } from './Store';
import { Order } from './Order';

@Table({
  tableName: 'customers',
  timestamps: true,
})
export class Customer extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @ForeignKey(() => Store)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  store_id!: number;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  telegram_id!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  name!: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  phone!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  address!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  email!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  notes!: string;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;

  // Relaciones
  @BelongsTo(() => Store)
  store!: Store;

  @HasMany(() => Order)
  orders!: Order[];
}
