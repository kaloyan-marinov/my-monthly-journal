import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm";

@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({
    unique: true,
    nullable: false,
    length: 255,
  })
  username?: string;

  @Column({
    nullable: false,
    length: 255,
  })
  name?: string;

  @Column({
    unique: true,
    nullable: false,
    length: 255,
  })
  email?: string;

  @Column({
    nullable: false,
    length: 255,
  })
  password?: string;

  @CreateDateColumn({
    default: () => "CURRENT_TIMESTAMP",
    type: "datetime",
    name: "created_at",
  })
  createdAt?: Date;

  @UpdateDateColumn({
    default: () => "CURRENT_TIMESTAMP",
    type: "datetime",
    name: "updated_at",
  })
  updatedAt?: Date;

  @OneToMany(() => Entry, (entry: Entry) => entry.user, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  entries?: Array<Entry>;
}

@Entity({ name: "entries" })
export class Entry {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({
    nullable: false,
  })
  timestamp?: string;

  @Column({
    nullable: false,
  })
  content?: string;

  @CreateDateColumn({
    default: () => "CURRENT_TIMESTAMP",
    type: "datetime",
    name: "created_at",
  })
  createdAt?: Date;

  @UpdateDateColumn({
    default: () => "CURRENT_TIMESTAMP",
    type: "datetime",
    name: "updated_at",
  })
  updatedAt?: Date;

  @Column({
    nullable: false,
    name: "user_id",
  })
  userId?: number;

  @ManyToOne(() => User, (user: User) => user.entries, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user?: User;
}
