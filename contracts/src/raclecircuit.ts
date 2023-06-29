import {
    SmartContract,
    state,
    State,
    method,
    Permissions,
    Field,
    UInt64,
    UInt32,
    PublicKey,
    Experimental,
    MerkleMapWitness,
    Poseidon,
    SelfProof,
    Struct,
    Circuit, arrayProp, Sign, Signature
  } from 'snarkyjs';
  // import { ExampleToken } from './Token.js';
  
  export class DataRecursiveInput extends Struct({
    oracle_public_key: PublicKey,
    oracle_signature: Signature,
    call_results: Signature,
    api_result_offchain: Field,
    api_result_onchain: Field,
  }) {}
  
  export const RecursiveProgram = Experimental.ZkProgram({
    publicInput: DataRecursiveInput ,
  
    methods: {
      /**
       * baseCase only verifies witnesses. No transfer of funds should be made in this step.
       */
      baseCase: {
        privateInputs: [],
  
        method(publicInput: DataRecursiveInput ) {
          const {oracle_public_key, oracle_signature, call_results, api_resul_offchain, api_result_onchain} = publicInput
          let calculate_median = (values:typeof call_results) =>{

          }
          function calculateMean(values: number[]): number {
            let sum = values.reduce((a, b) => a + b, 0);
            return sum / values.length;
          }

          let mean =  calculateMean(api_resul_offchain);

          let [balanceRootBefore] =
            balance1Witness.computeRootAndKey(user1Balance);
          balanceRootBefore.assertEquals(balanceRoot, "balance1Witness does not match root");
          [balanceRootBefore] =
            balance2Witness.computeRootAndKey(user2Balance);
          balanceRootBefore.assertEquals(balanceRoot, "balance2Witness does not match root");
          transferFrom1to2.assertEquals(Field(0), 'In the baseCase transfer amount should be 0')
        },
      },
  
      step: {
        privateInputs: [SelfProof],
  
        /**
         * this method only cares about publicInput.transferFrom1To2
         * notice that transferFrom1To2 can be negative depending on who is transferring to who
         */
        method(publicInput: DataRecursiveInput , earlierProof: SelfProof<DataRecursiveInput >) {
          // verify earlier proof
          earlierProof.verify();
          // assert balances are >= 0 for both parties
          publicInput.user1Balance.assertGreaterThanOrEqual(0, "user1 balance cannot be < 0 due to this transfer")
          publicInput.user2Balance.assertGreaterThanOrEqual(0, "user2 balance cannot be < 0 due to this transfer")
  
          earlierProof.publicInput.user1Balance.sub(publicInput.transferFrom1to2).assertEquals(publicInput.user1Balance, "user1 balance is not correct")
          earlierProof.publicInput.user2Balance.add(publicInput.transferFrom1to2).assertEquals(publicInput.user2Balance, "user2 balance is not correct")
        },
      },
    },
  });
  
  export class RecursiveProof extends Experimental.ZkProgram.Proof(RecursiveProgram) {}
  
  export class Lightning extends SmartContract {
    /**
     * We need a hash map that tells us user|token -> the amount of time left until time lock expires.
     * every time sendTokens is called we first check the time lock is not expired
     */
    @state(Field) timeLockMerkleMapRoot = State<Field>();
    @state(Field) balanceMerkleMapRoot = State<Field>();
  
    deploy() {
      super.deploy();
  
      const permissionToEdit = Permissions.proof();
  
      this.account.permissions.set({
        ...Permissions.default(),
        editState: permissionToEdit,
        setTokenSymbol: permissionToEdit,
        send: permissionToEdit,
        receive: permissionToEdit,
      });
    }
  
    @method init() {
      super.init();
    }
  
    @method initState(timeLockRoot: Field, balanceRoot: Field) {
      this.timeLockMerkleMapRoot.set(timeLockRoot);
      this.balanceMerkleMapRoot.set(balanceRoot);
    }
  
    /**
     * Deposits a particular token balance and locks it for at least the next 5 blocks
     */
    @method deposit(
      userAddress: PublicKey,
      tokenAddress: PublicKey,
      tokenAmount: UInt64,
      timeLock: UInt32,
      timeLockBefore: Field,
      balanceBefore: Field,
      timeLockPath: MerkleMapWitness,
      balancePath: MerkleMapWitness
    ) {
      const token = new ExampleToken(tokenAddress);
      const blockHeight = this.network.blockchainLength.get();
      this.network.blockchainLength.assertEquals(
        this.network.blockchainLength.get()
      );
      
      timeLock.assertGreaterThan(blockHeight.add(5), "timeLock must be at least 5 blocks ahead")
  
      // deposit tokens from the user to this contract
      token.sendTokens(userAddress, this.address, tokenAmount);
  
      // get state roots
      const timeLockRoot = this.timeLockMerkleMapRoot.get();
      this.timeLockMerkleMapRoot.assertEquals(timeLockRoot);
  
      const balanceRoot = this.balanceMerkleMapRoot.get();
      this.balanceMerkleMapRoot.assertEquals(balanceRoot);
  
      // verify witnesses
      const [timeLockRootBefore, timeLockKey] =
        timeLockPath.computeRootAndKey(timeLockBefore);
      timeLockRootBefore.assertEquals(timeLockRoot, "deposit time lock root not equal");
      timeLockKey.assertEquals(
        this.serializeTimeLockKey(userAddress, tokenAddress), "deposit time lock keys not equal"
      );
      const [balanceRootBefore, balanceKey] =
        balancePath.computeRootAndKey(balanceBefore);
      balanceRootBefore.assertEquals(balanceRoot, "deposit balance root not equal");
      balanceKey.assertEquals(
        this.serializeBalancekKey(userAddress, tokenAddress), "deposit balance keys not equal"
      );
  
      // compute the new timeLock root after adding more time lock to the user's deposit
      const [newTimeLockRoot] = timeLockPath.computeRootAndKey(
        Field.fromFields(timeLock.toFields())
      );
      // compute the new root after incrementing the balance for the user for that token
      const [newBalanceRoot] = balancePath.computeRootAndKey(
        balanceBefore.add(Field.fromFields(tokenAmount.toFields()))
      );
  
      // set new roots
      this.timeLockMerkleMapRoot.set(newTimeLockRoot);
      this.balanceMerkleMapRoot.set(newBalanceRoot);
    }
  
    @method postProof(
      tokenAddress: PublicKey,
      userAddress: PublicKey,
      balanceWitness: MerkleMapWitness,
      balance: Field,
      proof: RecursiveProof
    ) {
      proof.verify()
      const { user1Balance, user2Balance, user1 } = proof.publicInput
  
      const balanceRoot = this.balanceMerkleMapRoot.get();
      this.balanceMerkleMapRoot.assertEquals(balanceRoot);
  
      const [balanceRootBefore, balanceKey] = balanceWitness.computeRootAndKey(balance);
      balanceRootBefore.assertEquals(balanceRoot);
      balanceKey.assertEquals(
        this.serializeBalancekKey(userAddress, tokenAddress)
      );
  
      const newBalance = Circuit.if(userAddress.equals(user1), user1Balance, user2Balance)
  
      let [newBalanceRoot] = balanceWitness.computeRootAndKey(
        newBalance
      );
  
      this.balanceMerkleMapRoot.set(newBalanceRoot);
    }
  
    @method withdraw(
      tokenAddress: PublicKey,
      userAddress: PublicKey,
      timeLockWitness: MerkleMapWitness,
      balanceWitness: MerkleMapWitness,
      timeLock: Field,
      balance: Field
    ) {
      // get state roots
      const timeLockRoot = this.timeLockMerkleMapRoot.get();
      this.timeLockMerkleMapRoot.assertEquals(timeLockRoot);
  
      const balanceRoot = this.balanceMerkleMapRoot.get();
      this.balanceMerkleMapRoot.assertEquals(balanceRoot);
  
      // verify witnesses
      const [timeLockRootBefore, timeLockKey] =
      timeLockWitness.computeRootAndKey(timeLock);
      timeLockRootBefore.assertEquals(timeLockRoot, "withdraw time lock  is wrong");
      timeLockKey.assertEquals(
        this.serializeTimeLockKey(userAddress, tokenAddress), "wirthdraw time lock keys not equal"
      );
      const [balanceRootBefore, balanceKey] =
        balanceWitness.computeRootAndKey(balance);
      balanceRootBefore.assertEquals(balanceRoot, "deposit balance root not equal");
      balanceKey.assertEquals(
        this.serializeBalancekKey(userAddress, tokenAddress), "deposit balance keys not equal"
      );
  
      this.network.blockchainLength.assertEquals(this.network.blockchainLength.get())
      timeLock.assertLessThan(Field.fromFields(this.network.blockchainLength.get().toFields()), "cannot withdraw before time lock period ends")
      
      // send the tokens to the user
      const token = new ExampleToken(tokenAddress);
      token.sendTokens(this.address, userAddress, UInt64.from(balance))
  
      // reset state for that user
      const [newBalanceRoot] = balanceWitness.computeRootAndKey(
        Field(0)
      );
      const [newTimeLockRoot] = timeLockWitness.computeRootAndKey(
        Field(0)
      );
      this.balanceMerkleMapRoot.set(newBalanceRoot);
      this.timeLockMerkleMapRoot.set(newTimeLockRoot);
    }
  
    @method serializeTimeLockKey(
      userAddress: PublicKey,
      tokenAddress: PublicKey
    ): Field {
      return Poseidon.hash([
        ...userAddress.toFields(),
        ...tokenAddress.toFields(),
        Field(0),
      ]);
    }
  
    @method serializeBalancekKey(
      userAddress: PublicKey,
      tokenAddress: PublicKey
    ): Field {
      return Poseidon.hash([
        ...userAddress.toFields(),
        ...tokenAddress.toFields(),
        Field(1),
      ]);
    }
  }
  