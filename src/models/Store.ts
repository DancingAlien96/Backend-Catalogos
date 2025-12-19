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
import { User } from './User';
import { Product } from './Product';
import { Category } from './Category';
import { Customer } from './Customer';
import { Order } from './Order';
import { Plan } from './Plan';

@Table({
  tableName: 'stores',
  timestamps: true,
})
export class Store extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  user_id!: number;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  name!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    unique: true,
  })
  slug!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    unique: true,
  })
  api_key!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  api_secret!: string;

  @ForeignKey(() => Plan)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  plan_id!: number | null;

  @BelongsTo(() => Plan)
  plan!: Plan;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  bot_token!: string;

  @Column({
    type: DataType.ENUM('trial', 'active', 'paused', 'cancelled'),
    defaultValue: 'trial',
  })
  subscription_status!: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  trial_ends_at!: Date;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  settings!: any;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  is_active!: boolean;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;

  // Relaciones
  @BelongsTo(() => User)
  user!: User;

  @HasMany(() => Product)
  products!: Product[];

  @HasMany(() => Category)
  categories!: Category[];

  @HasMany(() => Customer)
  customers!: Customer[];

  @HasMany(() => Order)
  orders!: Order[];
}
