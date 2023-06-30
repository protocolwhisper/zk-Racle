/**
 * @title Zkracle Contract
 * @author protocolwhisper
 *
 * @notice This contract takes arguments from multiple APIs and uses zk proof to compute the median, standard deviations, and z-score
 *         to determine which API call has the worst result. If the result exceeds three standard deviations of tolerance,
 *         the contract flags that API from accessing further contract functionality.
 */

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
  //import { ExampleToken } from './Token.js';
  
  export class DataRecursiveInput extends Struct({
    oracle_public_key: Field,
    oracle_signature: Signature,
    call_results: Signature,
    api_result_offchain: Field,
    api_result_onchain: Field,
  }) {}
  
  export const ZkZscores = Experimental.ZkProgram({
    publicInput: DataRecursiveInput ,
  
    methods: {
      /**
       * baseCase only verifies witnesses. No transfer of funds should be made in this step.
       */
      baseCase: {
        privateInputs: [],
  
        method(publicInput: DataRecursiveInput ) {
          const {oracle_public_key, oracle_signature, call_results, api_result_offchain, api_result_onchain} = publicInput
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
          // I can implement here for just obtaining the a random value that it's not the same as de worst z-score
        // So for each roundId I have a value which will make sense tho 
          publicInput.user1Balance.assertGreaterThanOrEqual(0, "user1 balance cannot be < 0 due to this transfer")
          publicInput.user2Balance.assertGreaterThanOrEqual(0, "user2 balance cannot be < 0 due to this transfer")
  
          earlierProof.publicInput.user1Balance.sub(publicInput.transferFrom1to2).assertEquals(publicInput.user1Balance, "user1 balance is not correct")
          earlierProof.publicInput.user2Balance.add(publicInput.transferFrom1to2).assertEquals(publicInput.user2Balance, "user2 balance is not correct")
        },
      },
    },
  });
  
  export class RecursiveProof extends Experimental.ZkProgram.Proof(ZkZscores) {}

  
  const TRUSTED_ORACLE = "B62qibrVhEnDYFnZmPCyuvtxcVRxD62bLBsSTmFS85AP7g7X9fsBepJ"
  export class Lightning extends SmartContract {
    /**
     * We need a hash map that tells us user|token -> the amount of time left until time lock expires.
     * every time sendTokens is called we first check the time lock is not expired
     * 
     */
      // Define contract state
    @state(PublicKey) oraclePublicKey = State<PublicKey>();
    @state(Field) timeLockMerkleMapRoot = State<Field>();
    @state(Field) balanceMerkleMapRoot = State<Field>();
    // This doesn't work 
    @state(arrayProp) api_responses = State<arrayProp>();

    events = {
      verified: Field,
    };
  
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
     * Verifys is the input Response is from the Oracle
     */
    @method verifySignature(roundIdField: Field, 
      priceField : Field,
      nearbyField1 : Field,
      nearbyField2: Field,
      nearbyField3: Field,signature: Signature){
        const oraclePublicKey = this.oraclePublicKey.get()
        this.oraclePublicKey.assertEquals(oraclePublicKey);
        // Evaluate whether the signature is valid for the provided data
        const validSignature = signature.verify(oraclePublicKey, [roundIdField, priceField , nearbyField1 , nearbyField2 , nearbyField3]);
        validSignature.assertTrue();
        // Emit an event containing the verified users id
        this.emitEvent('verified', roundIdField);
      }

    @method postProof(proof: RecursiveProof){
      // The proof is correct now whut?
    }
        
  }
  